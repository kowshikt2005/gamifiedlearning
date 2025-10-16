'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
// Simple requestAnimationFrame promise wrapper
const requestAnimationFramePromise = (): Promise<number> => {
  return new Promise(resolve => requestAnimationFrame(resolve));
};

interface AnimationState {
  isAnimating: boolean;
  animationType: string | null;
}

interface UseSmoothAnimationsOptions {
  duration?: number;
  easing?: string;
  onAnimationStart?: () => void;
  onAnimationEnd?: () => void;
}

export function useSmoothAnimations(options: UseSmoothAnimationsOptions = {}) {
  const {
    duration = 300,
    easing = 'ease-in-out',
    onAnimationStart,
    onAnimationEnd,
  } = options;

  const [animationState, setAnimationState] = useState<AnimationState>({
    isAnimating: false,
    animationType: null,
  });

  const animationRef = useRef<number | null>(null);
  const elementRef = useRef<HTMLElement | null>(null);

  // Cleanup function
  const cleanup = useCallback(() => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
  }, []);

  // Start animation
  const startAnimation = useCallback(async (
    element: HTMLElement,
    animationType: string,
    fromStyles: Partial<CSSStyleDeclaration>,
    toStyles: Partial<CSSStyleDeclaration>
  ) => {
    if (animationState.isAnimating) {
      cleanup();
    }

    setAnimationState({ isAnimating: true, animationType });
    onAnimationStart?.();

    elementRef.current = element;

    // Apply initial styles
    Object.assign(element.style, fromStyles);

    // Wait for next frame to ensure styles are applied
    await requestAnimationFramePromise();

    // Apply transition
    element.style.transition = `all ${duration}ms ${easing}`;

    // Apply final styles
    Object.assign(element.style, toStyles);

    // Wait for animation to complete
    const animationPromise = new Promise<void>((resolve) => {
      const handleTransitionEnd = () => {
        element.removeEventListener('transitionend', handleTransitionEnd);
        resolve();
      };
      element.addEventListener('transitionend', handleTransitionEnd);
      
      // Fallback timeout
      setTimeout(resolve, duration + 50);
    });

    await animationPromise;

    setAnimationState({ isAnimating: false, animationType: null });
    onAnimationEnd?.();
  }, [animationState.isAnimating, duration, easing, onAnimationStart, onAnimationEnd, cleanup]);

  // Flip card animation
  const flipCard = useCallback(async (element: HTMLElement, isFlipped: boolean) => {
    const rotateY = isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)';
    
    await startAnimation(
      element,
      'flip',
      { transform: isFlipped ? 'rotateY(0deg)' : 'rotateY(180deg)' },
      { transform: rotateY }
    );
  }, [startAnimation]);

  // Slide animation
  const slideCard = useCallback(async (
    element: HTMLElement,
    direction: 'left' | 'right',
    distance: number = 100
  ) => {
    const translateX = direction === 'left' ? `-${distance}%` : `${distance}%`;
    
    await startAnimation(
      element,
      'slide',
      { transform: 'translateX(0)' },
      { transform: `translateX(${translateX})` }
    );

    // Reset position after animation
    element.style.transform = 'translateX(0)';
  }, [startAnimation]);

  // Fade animation
  const fadeCard = useCallback(async (
    element: HTMLElement,
    fadeIn: boolean = true
  ) => {
    await startAnimation(
      element,
      'fade',
      { opacity: fadeIn ? '0' : '1' },
      { opacity: fadeIn ? '1' : '0' }
    );
  }, [startAnimation]);

  // Scale animation
  const scaleCard = useCallback(async (
    element: HTMLElement,
    scale: number = 1.05
  ) => {
    await startAnimation(
      element,
      'scale',
      { transform: 'scale(1)' },
      { transform: `scale(${scale})` }
    );

    // Reset scale after animation
    setTimeout(() => {
      if (element) {
        element.style.transform = 'scale(1)';
      }
    }, duration);
  }, [startAnimation, duration]);

  // Bounce animation for feedback
  const bounceCard = useCallback(async (element: HTMLElement) => {
    const keyframes = [
      { transform: 'scale(1)' },
      { transform: 'scale(1.1)' },
      { transform: 'scale(0.95)' },
      { transform: 'scale(1)' },
    ];

    const animation = element.animate(keyframes, {
      duration: 400,
      easing: 'ease-in-out',
    });

    setAnimationState({ isAnimating: true, animationType: 'bounce' });
    onAnimationStart?.();

    await animation.finished;

    setAnimationState({ isAnimating: false, animationType: null });
    onAnimationEnd?.();
  }, [onAnimationStart, onAnimationEnd]);

  // Cleanup on unmount
  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  return {
    animationState,
    flipCard,
    slideCard,
    fadeCard,
    scaleCard,
    bounceCard,
    startAnimation,
    cleanup,
  };
}

// Hook for managing card transitions
export function useCardTransitions() {
  const [isTransitioning, setIsTransitioning] = useState(false);


  const transitionToCard = useCallback(async (
    fromElement: HTMLElement,
    toElement: HTMLElement,
    direction: 'next' | 'previous' = 'next'
  ) => {
    if (isTransitioning) return;

    setIsTransitioning(true);

    const slideDistance = direction === 'next' ? -100 : 100;
    const enterDistance = direction === 'next' ? 100 : -100;

    // Prepare incoming element
    toElement.style.transform = `translateX(${enterDistance}%)`;
    toElement.style.opacity = '0';

    await requestAnimationFramePromise();

    // Animate both elements
    const outAnimation = fromElement.animate([
      { transform: 'translateX(0)', opacity: '1' },
      { transform: `translateX(${slideDistance}%)`, opacity: '0' }
    ], {
      duration: 300,
      easing: 'ease-in-out',
      fill: 'forwards'
    });

    const inAnimation = toElement.animate([
      { transform: `translateX(${enterDistance}%)`, opacity: '0' },
      { transform: 'translateX(0)', opacity: '1' }
    ], {
      duration: 300,
      easing: 'ease-in-out',
      fill: 'forwards'
    });

    await Promise.all([outAnimation.finished, inAnimation.finished]);

    // Reset styles
    fromElement.style.transform = '';
    fromElement.style.opacity = '';
    toElement.style.transform = '';
    toElement.style.opacity = '';

    setIsTransitioning(false);
  }, [isTransitioning]);

  return {
    isTransitioning,
    transitionToCard,
  };
}

// Hook for managing loading animations
export function useLoadingAnimations() {
  const [isLoading, setIsLoading] = useState(false);
  const loadingRef = useRef<HTMLElement | null>(null);

  const startLoading = useCallback((element?: HTMLElement) => {
    setIsLoading(true);
    if (element) {
      loadingRef.current = element;
      element.style.pointerEvents = 'none';
      element.style.opacity = '0.7';
    }
  }, []);

  const stopLoading = useCallback(() => {
    setIsLoading(false);
    if (loadingRef.current) {
      loadingRef.current.style.pointerEvents = '';
      loadingRef.current.style.opacity = '';
      loadingRef.current = null;
    }
  }, []);

  return {
    isLoading,
    startLoading,
    stopLoading,
  };
}