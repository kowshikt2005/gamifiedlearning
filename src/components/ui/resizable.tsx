'use client';

import { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface ResizableProps {
  children: React.ReactNode;
  initialWidth?: number;
  minWidth?: number;
  maxWidth?: number;
  className?: string;
}

export function Resizable({
  children,
  initialWidth = 50,
  minWidth = 20,
  maxWidth = 80,
  className,
}: ResizableProps) {
  const [width, setWidth] = useState(initialWidth);
  const [isResizing, setIsResizing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const startXRef = useRef(0);
  const startWidthRef = useRef(0);

  const startResizing = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
    startXRef.current = e.clientX;
    startWidthRef.current = width;
    
    // Add visual feedback when resizing starts
    if (containerRef.current) {
      containerRef.current.classList.add('animate-pulseGlow');
    }
  };

  const stopResizing = () => {
    setIsResizing(false);
    
    // Remove visual feedback when resizing stops
    if (containerRef.current) {
      containerRef.current.classList.remove('animate-pulseGlow');
    }
  };

  const resize = (e: MouseEvent) => {
    if (!isResizing || !containerRef.current) return;

    const containerRect = containerRef.current.getBoundingClientRect();
    const deltaX = e.clientX - startXRef.current;
    const containerWidth = containerRect.width;
    const deltaPercent = (deltaX / containerWidth) * 100;
    
    const newWidth = Math.min(Math.max(startWidthRef.current + deltaPercent, minWidth), maxWidth);
    setWidth(newWidth);
  };

  useEffect(() => {
    if (isResizing) {
      window.addEventListener('mousemove', resize);
      window.addEventListener('mouseup', stopResizing);
    }

    return () => {
      window.removeEventListener('mousemove', resize);
      window.removeEventListener('mouseup', stopResizing);
    };
  }, [isResizing, resize]);

  return (
    <div 
      ref={containerRef}
      className={cn("relative group transition-all duration-300", className)}
      style={{ width: `${width}%` }}
    >
      {children}
      <div
        className="absolute top-0 right-0 h-full w-2 cursor-col-resize bg-transparent group-hover:bg-primary/30 transition-all duration-300 z-10 flex items-center justify-center"
        onMouseDown={startResizing}
      >
        <div className="h-10 w-1 bg-primary/50 rounded-full group-hover:bg-primary group-hover:w-1.5 transition-all duration-300" />
      </div>
    </div>
  );
}