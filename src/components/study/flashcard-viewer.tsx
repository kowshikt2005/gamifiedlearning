'use client';

import { useState, useCallback, useEffect, useRef, useMemo, memo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Slider } from '@/components/ui/slider';
import { 
  ChevronLeft, 
  ChevronRight, 
  RotateCcw, 
  Heart, 
  CheckCircle, 
  Clock, 
  ArrowLeft,
  Keyboard,
  BookOpen,
  Save,
  Loader2,
  Settings,
  Maximize2,
  Minimize2,
  RotateCw,
  ZoomIn,
  ZoomOut
} from 'lucide-react';
import { Flashcard, CardAction } from '@/lib/models/flashcard';
import { cn } from '@/lib/utils';
import { useFlashcardActions } from '@/hooks/use-flashcard-actions';
import { useSmoothAnimations } from '@/hooks/use-smooth-animations';


interface FlashcardViewerProps {
  flashcards: Flashcard[];
  taskId: string;
  pdfTitle: string;
  onBackToPdf: () => void;
}

interface CardState {
  isFlipped: boolean;
  action?: CardAction;
}

interface LayoutSettings {
  cardHeight: number;
  cardWidth: number;
  fontSize: number;
  padding: number;
  isCompact: boolean;
}

const FlashcardViewerComponent = ({
  flashcards,
  taskId,
  pdfTitle,
  onBackToPdf
}: FlashcardViewerProps) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [cardStates, setCardStates] = useState<Record<string, CardState>>({});
  const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(null);
  const [touchEnd, setTouchEnd] = useState<{ x: number; y: number } | null>(null);
  const [showLayoutControls, setShowLayoutControls] = useState(false);
  const [layoutSettings, setLayoutSettings] = useState<LayoutSettings>(() => {
    // Load saved layout settings from localStorage
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('flashcard-layout-settings');
        if (saved) {
          return JSON.parse(saved);
        }
      } catch (error) {
        console.warn('Failed to load layout settings:', error);
      }
    }
    return {
      cardHeight: 550, // Increased default height
      cardWidth: 100, // percentage
      fontSize: 100, // percentage
      padding: 100, // percentage
      isCompact: false,
    };
  });
  const cardRef = useRef<HTMLDivElement>(null);

  // Animation state
  const { flipCard, bounceCard, animationState } = useSmoothAnimations({
    duration: 300,
    onAnimationStart: () => {
      // Disable interactions during animation
      if (cardRef.current) {
        cardRef.current.style.pointerEvents = 'none';
      }
    },
    onAnimationEnd: () => {
      // Re-enable interactions after animation
      if (cardRef.current) {
        cardRef.current.style.pointerEvents = '';
      }
    },
  });

  // Use the flashcard actions hook
  const {
    cardActions,
    actionStats,
    handleCardAction,
    saveFlashcards,
    isSaving,
    resetActions
  } = useFlashcardActions({
    flashcards,
    taskId,
    pdfTitle
  });

  // Memoized current card and state to prevent unnecessary re-renders
  // Initialize card states with memoization - moved before early return
  const initialCardStates = useMemo(() => {
    const initialStates: Record<string, CardState> = {};
    flashcards.forEach(card => {
      if (card?.id) {
        initialStates[card.id] = { isFlipped: false };
      }
    });
    return initialStates;
  }, [flashcards]);

  useEffect(() => {
    setCardStates(initialCardStates);
  }, [initialCardStates]);

  // Memoized current card calculations - moved before useEffect
  const currentCard = useMemo(() => flashcards[currentIndex], [flashcards, currentIndex]);
  const currentCardState = useMemo(() => 
    cardStates[currentCard?.id] || { isFlipped: false }, 
    [cardStates, currentCard?.id]
  );
  const currentCardAction = useMemo(() => 
    cardActions[currentCard?.id], 
    [cardActions, currentCard?.id]
  );

  // Optimized keyboard navigation with proper cleanup
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Prevent default behavior for navigation keys
      if (['ArrowLeft', 'ArrowRight', 'Space', 'Escape'].includes(event.code)) {
        event.preventDefault();
      }

      switch (event.code) {
        case 'ArrowLeft':
          goToPrevious();
          break;
        case 'ArrowRight':
          goToNext();
          break;
        case 'Space':
          flipCardState();
          break;
        case 'Escape':
          onBackToPdf();
          break;
        case 'KeyS':
          if ((event.ctrlKey || event.metaKey) && currentCard) {
            event.preventDefault();
            handleCardAction(currentCard.id, 'saved');
          }
          break;
        case 'KeyK':
          if ((event.ctrlKey || event.metaKey) && currentCard) {
            event.preventDefault();
            handleCardAction(currentCard.id, 'known');
          }
          break;
        case 'KeyR':
          if ((event.ctrlKey || event.metaKey) && currentCard) {
            event.preventDefault();
            handleCardAction(currentCard.id, 'review');
          }
          break;
        case 'KeyL':
          if (event.ctrlKey || event.metaKey) {
            event.preventDefault();
            setShowLayoutControls(!showLayoutControls);
          }
          break;
        case 'KeyC':
          if (event.ctrlKey || event.metaKey) {
            event.preventDefault();
            toggleCompactMode();
          }
          break;
        case 'Equal':
        case 'NumpadAdd':
          if (event.ctrlKey || event.metaKey) {
            event.preventDefault();
            updateLayoutSetting('fontSize', Math.min(layoutSettings.fontSize + 10, 150));
          }
          break;
        case 'Minus':
        case 'NumpadSubtract':
          if (event.ctrlKey || event.metaKey) {
            event.preventDefault();
            updateLayoutSetting('fontSize', Math.max(layoutSettings.fontSize - 10, 70));
          }
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, currentCardState.isFlipped, currentCard, handleCardAction, onBackToPdf]);

  // Touch handlers for mobile swipe support
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    setTouchStart({ x: touch.clientX, y: touch.clientY });
    setTouchEnd(null);
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    setTouchEnd({ x: touch.clientX, y: touch.clientY });
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (!touchStart || !touchEnd) return;

    const deltaX = touchStart.x - touchEnd.x;
    const deltaY = touchStart.y - touchEnd.y;
    const minSwipeDistance = 50;

    // Horizontal swipe (navigation)
    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > minSwipeDistance) {
      if (deltaX > 0) {
        goToNext(); // Swipe left = next card
      } else {
        goToPrevious(); // Swipe right = previous card
      }
    }
    // Vertical swipe (flip card)
    else if (Math.abs(deltaY) > minSwipeDistance && Math.abs(deltaX) < 30) {
      flipCardState();
    }

    setTouchStart(null);
    setTouchEnd(null);
  }, [touchStart, touchEnd, currentIndex]);

  const goToNext = useCallback(() => {
    if (currentIndex < flashcards.length - 1) {
      setCurrentIndex(prev => prev + 1);
    }
  }, [currentIndex, flashcards.length]);

  const goToPrevious = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    }
  }, [currentIndex]);

  const flipCardState = useCallback(() => {
    if (!currentCard?.id || animationState.isAnimating) return;
    
    setCardStates(prev => {
      const currentState = prev[currentCard.id];
      const newFlippedState = !currentState?.isFlipped;
      
      // Trigger smooth flip animation
      if (cardRef.current) {
        flipCard(cardRef.current, newFlippedState);
      }
      
      return {
        ...prev,
        [currentCard.id]: {
          ...currentState,
          isFlipped: newFlippedState
        }
      };
    });
  }, [currentCard, animationState.isAnimating, flipCard]);

  // Handle save flashcards action with visual feedback
  const handleSaveFlashcards = useCallback(async () => {
    const success = await saveFlashcards();
    if (success && cardRef.current) {
      // Provide visual feedback with bounce animation
      bounceCard(cardRef.current);
    }
  }, [saveFlashcards, bounceCard]);

  // Layout control functions
  const updateLayoutSetting = useCallback((key: keyof LayoutSettings, value: number | boolean) => {
    setLayoutSettings(prev => {
      const newSettings = {
        ...prev,
        [key]: value
      };
      // Save to localStorage
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('flashcard-layout-settings', JSON.stringify(newSettings));
        } catch (error) {
          console.warn('Failed to save layout settings:', error);
        }
      }
      return newSettings;
    });
  }, []);

  const resetLayoutSettings = useCallback(() => {
    const defaultSettings = {
      cardHeight: 550, // Increased default height
      cardWidth: 100,
      fontSize: 100,
      padding: 100,
      isCompact: false,
    };
    setLayoutSettings(defaultSettings);
    // Save to localStorage
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('flashcard-layout-settings', JSON.stringify(defaultSettings));
      } catch (error) {
        console.warn('Failed to save layout settings:', error);
      }
    }
  }, []);

  const toggleCompactMode = useCallback(() => {
    setLayoutSettings(prev => ({
      ...prev,
      isCompact: !prev.isCompact,
      cardHeight: !prev.isCompact ? 400 : 550, // Increased heights
      fontSize: !prev.isCompact ? 85 : 100,
      padding: !prev.isCompact ? 75 : 100,
    }));
  }, []);

  // Calculate dynamic styles based on layout settings
  const cardStyles = useMemo(() => {
    const baseHeight = layoutSettings.cardHeight;
    const widthPercentage = Math.min(Math.max(layoutSettings.cardWidth, 60), 100);
    const fontScale = layoutSettings.fontSize / 100;
    const paddingScale = layoutSettings.padding / 100;

    return {
      height: `${baseHeight}px`,
      width: `${widthPercentage}%`,
      maxWidth: widthPercentage < 100 ? `${widthPercentage}%` : 'none',
      fontSize: {
        question: `${fontScale * (layoutSettings.isCompact ? 1.5 : 1.875)}rem`, // text-2xl or text-3xl
        answer: `${fontScale * (layoutSettings.isCompact ? 1.25 : 1.5)}rem`, // text-xl or text-2xl
        source: `${fontScale * (layoutSettings.isCompact ? 0.875 : 1)}rem`, // text-sm or text-base
      },
      padding: `${paddingScale * (layoutSettings.isCompact ? 2 : 3)}rem`,
      spacing: `${paddingScale * (layoutSettings.isCompact ? 1.5 : 2.5)}rem`,
    };
  }, [layoutSettings]);

  // Memoized action icon and color functions to prevent re-renders
  const getActionIcon = useCallback((action: CardAction) => {
    switch (action) {
      case 'saved':
        return <Heart className="h-4 w-4" />;
      case 'known':
        return <CheckCircle className="h-4 w-4" />;
      case 'review':
        return <Clock className="h-4 w-4" />;
    }
  }, []);



  // Memoized progress calculation
  const progress = useMemo(() => 
    ((currentIndex + 1) / flashcards.length) * 100, 
    [currentIndex, flashcards.length]
  );

  // Memoized review progress calculation
  const reviewProgress = useMemo(() => 
    ((actionStats.saved + actionStats.known + actionStats.review) / flashcards.length) * 100,
    [actionStats.saved, actionStats.known, actionStats.review, flashcards.length]
  );

  // Memoized total actions count
  const totalActions = useMemo(() => 
    actionStats.saved + actionStats.known + actionStats.review,
    [actionStats.saved, actionStats.known, actionStats.review]
  );



  // Early return with memoized empty state - moved after all hooks
  const emptyState = useMemo(() => (
    <Card className="h-full flex items-center justify-center">
      <CardContent className="text-center space-y-4">
        <BookOpen className="h-12 w-12 mx-auto text-muted-foreground" />
        <div>
          <h3 className="text-lg font-semibold">No Flashcards Available</h3>
          <p className="text-muted-foreground">Generate flashcards from your PDF to start studying.</p>
        </div>
        <Button onClick={onBackToPdf} variant="outline">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to PDF
        </Button>
      </CardContent>
    </Card>
  ), [onBackToPdf]);

  if (!flashcards.length) {
    return emptyState;
  }

  return (
    <div 
      className="h-full flex flex-col bg-gradient-to-br from-background to-muted/20 overflow-hidden"
      role="main"
      aria-label="Flashcard Viewer"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-card/50 backdrop-blur-sm">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={onBackToPdf}
            className="flex items-center gap-2"
            aria-label="Return to PDF view"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to PDF
          </Button>
          
          <div className="text-sm text-muted-foreground">
            Card {currentIndex + 1} of {flashcards.length}
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Enhanced Action Stats */}
          <div className="flex items-center gap-3 text-sm bg-muted/50 rounded-lg px-3 py-1.5">
            <div className="flex items-center gap-1 text-red-500" title="Saved for review">
              <Heart className="h-4 w-4" />
              <span className="font-medium">{actionStats.saved}</span>
            </div>
            <div className="w-px h-4 bg-border"></div>
            <div className="flex items-center gap-1 text-green-500" title="Marked as known">
              <CheckCircle className="h-4 w-4" />
              <span className="font-medium">{actionStats.known}</span>
            </div>
            <div className="w-px h-4 bg-border"></div>
            <div className="flex items-center gap-1 text-blue-500" title="Review later">
              <Clock className="h-4 w-4" />
              <span className="font-medium">{actionStats.review}</span>
            </div>
            {totalActions > 0 && (
              <>
                <div className="w-px h-4 bg-border"></div>
                <div className="text-xs text-muted-foreground">
                  {totalActions} marked
                </div>
              </>
            )}
          </div>

          {/* Layout Controls */}
          <div className="flex items-center gap-2">
            <Button
              onClick={() => setShowLayoutControls(!showLayoutControls)}
              size="sm"
              variant="outline"
              className="flex items-center gap-2"
              title="Adjust card layout and size"
            >
              <Settings className="h-4 w-4" />
              Layout
            </Button>
            
            <Button
              onClick={toggleCompactMode}
              size="sm"
              variant="outline"
              className="flex items-center gap-2"
              title={layoutSettings.isCompact ? "Switch to normal view" : "Switch to compact view"}
            >
              {layoutSettings.isCompact ? <Maximize2 className="h-4 w-4" /> : <Minimize2 className="h-4 w-4" />}
              {layoutSettings.isCompact ? 'Normal' : 'Compact'}
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <Button
              onClick={handleSaveFlashcards}
              size="sm"
              disabled={isSaving || totalActions === 0}
              className={cn(
                "transition-all duration-200",
                totalActions === 0 
                  ? "bg-muted text-muted-foreground cursor-not-allowed opacity-50" 
                  : "bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-white"
              )}
              title={totalActions === 0 ? "Mark some flashcards first" : `Save ${totalActions} marked flashcards`}
              data-testid="save-button"
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Progress {totalActions > 0 && `(${totalActions})`}
                </>
              )}
            </Button>
            
            {totalActions > 0 && (
              <Button
                onClick={resetActions}
                size="sm"
                variant="outline"
                disabled={isSaving}
              >
                Reset
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Layout Controls Panel */}
      {showLayoutControls && (
        <div className="px-4 py-3 bg-muted/30 border-b">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">Card Height</label>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => updateLayoutSetting('cardHeight', Math.max(layoutSettings.cardHeight - 50, 300))}
                  className="h-8 w-8 p-0"
                >
                  <Minimize2 className="h-3 w-3" />
                </Button>
                <Slider
                  value={[layoutSettings.cardHeight]}
                  onValueChange={([value]) => updateLayoutSetting('cardHeight', value)}
                  min={300}
                  max={700}
                  step={25}
                  className="flex-1"
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => updateLayoutSetting('cardHeight', Math.min(layoutSettings.cardHeight + 50, 700))}
                  className="h-8 w-8 p-0"
                >
                  <Maximize2 className="h-3 w-3" />
                </Button>
              </div>
              <div className="text-xs text-center text-muted-foreground">{layoutSettings.cardHeight}px</div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">Card Width</label>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => updateLayoutSetting('cardWidth', Math.max(layoutSettings.cardWidth - 10, 60))}
                  className="h-8 w-8 p-0"
                >
                  <Minimize2 className="h-3 w-3" />
                </Button>
                <Slider
                  value={[layoutSettings.cardWidth]}
                  onValueChange={([value]) => updateLayoutSetting('cardWidth', value)}
                  min={60}
                  max={100}
                  step={5}
                  className="flex-1"
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => updateLayoutSetting('cardWidth', Math.min(layoutSettings.cardWidth + 10, 100))}
                  className="h-8 w-8 p-0"
                >
                  <Maximize2 className="h-3 w-3" />
                </Button>
              </div>
              <div className="text-xs text-center text-muted-foreground">{layoutSettings.cardWidth}%</div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">Font Size</label>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => updateLayoutSetting('fontSize', Math.max(layoutSettings.fontSize - 10, 70))}
                  className="h-8 w-8 p-0"
                >
                  <ZoomOut className="h-3 w-3" />
                </Button>
                <Slider
                  value={[layoutSettings.fontSize]}
                  onValueChange={([value]) => updateLayoutSetting('fontSize', value)}
                  min={70}
                  max={150}
                  step={5}
                  className="flex-1"
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => updateLayoutSetting('fontSize', Math.min(layoutSettings.fontSize + 10, 150))}
                  className="h-8 w-8 p-0"
                >
                  <ZoomIn className="h-3 w-3" />
                </Button>
              </div>
              <div className="text-xs text-center text-muted-foreground">{layoutSettings.fontSize}%</div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">Spacing</label>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => updateLayoutSetting('padding', Math.max(layoutSettings.padding - 10, 50))}
                  className="h-8 w-8 p-0"
                >
                  <Minimize2 className="h-3 w-3" />
                </Button>
                <Slider
                  value={[layoutSettings.padding]}
                  onValueChange={([value]) => updateLayoutSetting('padding', value)}
                  min={50}
                  max={150}
                  step={5}
                  className="flex-1"
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => updateLayoutSetting('padding', Math.min(layoutSettings.padding + 10, 150))}
                  className="h-8 w-8 p-0"
                >
                  <Maximize2 className="h-3 w-3" />
                </Button>
              </div>
              <div className="text-xs text-center text-muted-foreground">{layoutSettings.padding}%</div>
            </div>
          </div>
          
          <div className="flex justify-center gap-2 mt-4">
            <Button
              onClick={resetLayoutSettings}
              size="sm"
              variant="outline"
              className="flex items-center gap-2"
            >
              <RotateCw className="h-3 w-3" />
              Reset to Default
            </Button>
            <Button
              onClick={() => setShowLayoutControls(false)}
              size="sm"
              variant="outline"
            >
              Close
            </Button>
          </div>
        </div>
      )}

      {/* Progress Bar with Enhanced Tracking */}
      <div className="px-4 py-2 bg-card/30">
        <div className="flex items-center justify-between mb-1">
          <div className="text-xs text-muted-foreground">
            Progress: {currentIndex + 1} of {flashcards.length}
          </div>
          {totalActions > 0 && (
            <div className="text-xs text-muted-foreground">
              {Math.round(reviewProgress)}% reviewed
            </div>
          )}
        </div>
        <Progress value={progress} className="h-2" />
        {totalActions > 0 && (
          <div className="mt-1">
            <Progress 
              value={reviewProgress} 
              className="h-1 opacity-60" 
            />
          </div>
        )}
      </div>

      {/* Main Flashcard Area */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden">
        <div className="min-h-full flex items-center justify-center p-2 md:p-4">
          <div className="w-full max-w-6xl flex flex-col justify-center py-4">
          {/* Navigation Buttons */}
          <div className="flex justify-between items-center mb-4">
            <Button
              variant="outline"
              size="icon"
              onClick={goToPrevious}
              disabled={currentIndex === 0}
              className="h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50"
              aria-label="Previous flashcard"
            >
              <ChevronLeft className="h-6 w-6" />
            </Button>

            <div className="text-center space-y-2">
              <div className="text-sm font-medium text-muted-foreground">
                {currentCardState.isFlipped ? 'Answer' : 'Question'}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={flipCardState}
                className="text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50 px-3 py-1.5 rounded-full"
              >
                <RotateCcw className="h-3 w-3 mr-1" />
                Flip Card
              </Button>
            </div>

            <Button
              variant="outline"
              size="icon"
              onClick={goToNext}
              disabled={currentIndex === flashcards.length - 1}
              className="h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50"
              aria-label="Next flashcard"
            >
              <ChevronRight className="h-6 w-6" />
            </Button>
          </div>

          {/* Flashcard */}
          <div 
            className="relative mb-4 flex items-center justify-center"
            style={{ 
              minHeight: `${layoutSettings.cardHeight}px`,
              perspective: '1000px'
            }}
          >
            <div
              className={cn(
                "relative cursor-pointer transition-all duration-700 ease-in-out shadow-xl hover:shadow-2xl mx-auto border-2 border-border",
                currentCardState.isFlipped && "[transform:rotateY(180deg)]",
                currentCardAction && "ring-2 ring-offset-2",
                currentCardAction === 'saved' && "ring-red-200 dark:ring-red-800",
                currentCardAction === 'known' && "ring-green-200 dark:ring-green-800", 
                currentCardAction === 'review' && "ring-blue-200 dark:ring-blue-800"
              )}
              style={{ 
                transformStyle: 'preserve-3d',
                height: cardStyles.height,
                width: cardStyles.width,
                maxWidth: cardStyles.maxWidth || 'none',
                minHeight: '400px' // Ensure minimum visibility
              }}
              onClick={flipCardState}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              role="button"
              tabIndex={0}
              aria-label={`Flashcard ${currentIndex + 1}: ${currentCardState.isFlipped ? 'showing answer' : 'showing question'}`}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  flipCardState();
                }
              }}
              data-testid="flashcard-container"
            >
              {/* Front Side (Question) */}
              <Card 
                className="absolute inset-0 w-full h-full rounded-xl border-2"
                style={{ 
                  backfaceVisibility: 'hidden',
                  transform: 'rotateY(0deg)'
                }}
              >
                <CardContent 
                  className="h-full flex flex-col justify-center items-center bg-gradient-to-br from-primary/5 to-accent/5 overflow-y-auto"
                  style={{ padding: cardStyles.padding }}
                >
                  <div className="text-center w-full max-w-4xl flex-1 flex flex-col justify-center" style={{ gap: cardStyles.spacing }}>
                    <div className="text-sm uppercase tracking-wider text-muted-foreground font-medium mb-4">
                      Question
                    </div>
                    <div className="flex-1 flex items-center justify-center">
                      <p 
                        className="font-semibold leading-relaxed text-center px-4"
                        style={{ 
                          fontSize: cardStyles.fontSize.question,
                          marginBottom: cardStyles.spacing 
                        }}
                      >
                        {currentCard?.front || 'No question available'}
                      </p>
                    </div>
                    {currentCard?.pageNumber && (
                      <div className="text-sm text-muted-foreground mt-4">
                        Page {currentCard.pageNumber}
                      </div>
                    )}
                  </div>
                  <div className="absolute bottom-6 right-6 text-sm text-muted-foreground opacity-60">
                    Click to reveal answer
                  </div>
                </CardContent>
              </Card>

              {/* Back Side (Answer) */}
              <Card 
                className="absolute inset-0 w-full h-full rounded-xl border-2"
                style={{ 
                  backfaceVisibility: 'hidden',
                  transform: 'rotateY(180deg)'
                }}
              >
                <CardContent 
                  className="h-full flex flex-col justify-center items-center bg-gradient-to-br from-secondary/5 to-muted/10 overflow-y-auto"
                  style={{ padding: cardStyles.padding }}
                >
                  <div className="text-center w-full max-w-4xl flex-1 flex flex-col justify-center" style={{ gap: cardStyles.spacing }}>
                    <div className="text-sm uppercase tracking-wider text-muted-foreground font-medium mb-4">
                      Answer
                    </div>
                    <div className="flex-1 flex flex-col items-center justify-center space-y-4">
                      <p 
                        className="leading-relaxed text-center px-4"
                        style={{ 
                          fontSize: cardStyles.fontSize.answer,
                          marginBottom: cardStyles.spacing 
                        }}
                      >
                        {currentCard?.back || 'No answer available'}
                      </p>
                      {currentCard?.sourceText && (
                        <div 
                          className="text-muted-foreground italic border-l-4 border-muted pl-6 max-w-3xl leading-relaxed"
                          style={{ 
                            fontSize: cardStyles.fontSize.source,
                            marginTop: cardStyles.spacing 
                          }}
                        >
                          &quot;{currentCard.sourceText.substring(0, layoutSettings.isCompact ? 150 : 250)}...&quot;
                        </div>
                      )}
                    </div>
                    {currentCard?.pageNumber && (
                      <div className="text-sm text-muted-foreground mt-4">
                        Page {currentCard.pageNumber}
                      </div>
                    )}
                  </div>
                  <div className="absolute bottom-6 right-6 text-sm text-muted-foreground opacity-60">
                    Click to show question
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-center gap-3 md:gap-4 mb-4">
            <Button
              variant={currentCardAction === 'saved' ? 'default' : 'outline'}
              size="lg"
              onClick={() => currentCard && handleCardAction(currentCard.id, 'saved')}
              className={cn(
                "flex items-center gap-2 px-6 py-3 transition-all duration-200 min-w-[120px]",
                currentCardAction === 'saved' 
                  ? "bg-red-500 hover:bg-red-600 text-white border-red-500" 
                  : "text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 border-red-200 dark:border-red-800"
              )}
              aria-label="Save this flashcard for later review"
            >
              {getActionIcon('saved')}
              <span className="font-medium">Save</span>
              {currentCardAction === 'saved' && (
                <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"></div>
              )}
            </Button>

            <Button
              variant={currentCardAction === 'known' ? 'default' : 'outline'}
              size="lg"
              onClick={() => currentCard && handleCardAction(currentCard.id, 'known')}
              className={cn(
                "flex items-center gap-2 px-6 py-3 transition-all duration-200 min-w-[120px]",
                currentCardAction === 'known' 
                  ? "bg-green-500 hover:bg-green-600 text-white border-green-500" 
                  : "text-green-500 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-950/20 border-green-200 dark:border-green-800"
              )}
              aria-label="Mark this flashcard as known"
            >
              {getActionIcon('known')}
              <span className="font-medium">Known</span>
              {currentCardAction === 'known' && (
                <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"></div>
              )}
            </Button>

            <Button
              variant={currentCardAction === 'review' ? 'default' : 'outline'}
              size="lg"
              onClick={() => currentCard && handleCardAction(currentCard.id, 'review')}
              className={cn(
                "flex items-center gap-2 px-6 py-3 transition-all duration-200 min-w-[120px]",
                currentCardAction === 'review' 
                  ? "bg-blue-500 hover:bg-blue-600 text-white border-blue-500" 
                  : "text-blue-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/20 border-blue-200 dark:border-blue-800"
              )}
              aria-label="Mark this flashcard for review later"
            >
              {getActionIcon('review')}
              <span className="font-medium">Review Later</span>
              {currentCardAction === 'review' && (
                <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"></div>
              )}
            </Button>
          </div>

          {/* Progress Summary (when actions are taken) */}
          {totalActions > 0 && (
            <div className="mb-3 p-3 bg-muted/30 rounded-lg border">
              <div className="text-center space-y-2">
                <h4 className="text-sm font-medium text-foreground">Study Progress Summary</h4>
                <div className="flex justify-center gap-6 text-sm">
                  <div className="text-center">
                    <div className="text-red-500 font-semibold">{actionStats.saved}</div>
                    <div className="text-xs text-muted-foreground">Saved</div>
                  </div>
                  <div className="text-center">
                    <div className="text-green-500 font-semibold">{actionStats.known}</div>
                    <div className="text-xs text-muted-foreground">Known</div>
                  </div>
                  <div className="text-center">
                    <div className="text-blue-500 font-semibold">{actionStats.review}</div>
                    <div className="text-xs text-muted-foreground">Review</div>
                  </div>
                  <div className="text-center">
                    <div className="text-foreground font-semibold">
                      {flashcards.length - totalActions}
                    </div>
                    <div className="text-xs text-muted-foreground">Remaining</div>
                  </div>
                </div>
                <div className="text-xs text-muted-foreground">
                  {Math.round(reviewProgress)}% of flashcards reviewed
                </div>
              </div>
            </div>
          )}

          {/* Keyboard Shortcuts Help */}
          <div className="text-center text-xs text-muted-foreground space-y-1 mt-2">
            <div className="flex items-center justify-center gap-4 flex-wrap">
              <span className="flex items-center gap-1">
                <Keyboard className="h-3 w-3" />
                <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs">←→</kbd> Navigate
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs">Space</kbd> Flip
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs">Esc</kbd> Back to PDF
              </span>
            </div>
            <div className="flex items-center justify-center gap-4 flex-wrap mt-2">
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs">Ctrl+S</kbd> Save
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs">Ctrl+K</kbd> Known
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs">Ctrl+R</kbd> Review
              </span>
            </div>
            <div className="flex items-center justify-center gap-4 flex-wrap mt-2">
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs">Ctrl+L</kbd> Layout
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs">Ctrl+C</kbd> Compact
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs">Ctrl+/-</kbd> Font Size
              </span>
            </div>
          </div>
          </div>
        </div>
      </div>

      {/* Screen reader announcements */}
      <div 
        aria-live="polite" 
        aria-atomic="true" 
        className="sr-only"
      >
        {`Flashcard ${currentIndex + 1} of ${flashcards.length}. ${
          currentCardState.isFlipped ? 'Showing answer' : 'Showing question'
        }. ${currentCardAction ? `Marked as ${currentCardAction}` : ''}`}
      </div>
    </div>
  );
};

// Export memoized component to prevent unnecessary re-renders
export const FlashcardViewer = memo(FlashcardViewerComponent);