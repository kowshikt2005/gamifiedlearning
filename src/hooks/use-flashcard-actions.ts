'use client';

import { useState, useCallback, useMemo } from 'react';
import { useToast } from '@/hooks/use-toast';
import { CardAction, Flashcard, FlashcardSaveRequest } from '@/lib/models/flashcard';

interface FlashcardActionState {
  [cardId: string]: CardAction;
}

interface UseFlashcardActionsProps {
  flashcards: Flashcard[];
  taskId: string;
  pdfTitle: string;
}

interface UseFlashcardActionsReturn {
  cardActions: FlashcardActionState;
  actionStats: {
    saved: number;
    known: number;
    review: number;
  };
  handleCardAction: (cardId: string, action: CardAction) => void;
  saveFlashcards: () => Promise<boolean>;
  isSaving: boolean;
  resetActions: () => void;
}

export function useFlashcardActions({
  flashcards,
  taskId,
  pdfTitle
}: UseFlashcardActionsProps): UseFlashcardActionsReturn {
  const { toast } = useToast();
  const [cardActions, setCardActions] = useState<FlashcardActionState>({});
  const [isSaving, setIsSaving] = useState(false);

  // Memoized action labels and descriptions to prevent recreation
  const actionLabels = useMemo(() => ({
    saved: 'Saved for review',
    known: 'Marked as known',
    review: 'Added to review list'
  }), []);

  const actionDescriptions = useMemo(() => ({
    saved: 'This card will be saved to your collection for future review.',
    known: 'This card is marked as mastered and won\'t appear in review sessions.',
    review: 'This card is flagged for additional review and practice.'
  }), []);

  // Handle individual card actions with optimized callback
  const handleCardAction = useCallback((cardId: string, action: CardAction) => {
    setCardActions(prev => {
      const previousAction = prev[cardId];
      
      // Only update if action is different to prevent unnecessary re-renders
      if (previousAction === action) {
        return prev;
      }

      // Defer toast notification to avoid setState during render
      setTimeout(() => {
        toast({
          title: `✨ ${actionLabels[action]}`,
          description: previousAction 
            ? `Changed from "${previousAction}" to "${action}". ${actionDescriptions[action]}`
            : actionDescriptions[action],
          duration: 3000,
        });
      }, 0);

      return {
        ...prev,
        [cardId]: action
      };
    });
  }, [toast, actionLabels, actionDescriptions]);

  // Memoized action statistics calculation
  const actionStats = useMemo(() => {
    const actions = Object.values(cardActions);
    return {
      saved: actions.filter(action => action === 'saved').length,
      known: actions.filter(action => action === 'known').length,
      review: actions.filter(action => action === 'review').length,
    };
  }, [cardActions]);

  // Memoized flashcards with actions to prevent recalculation
  const flashcardsWithActions = useMemo(() => {
    return flashcards
      .filter(card => cardActions[card.id])
      .map(card => ({
        id: card.id,
        question: card.front,
        answer: card.back,
        pageNumber: card.pageNumber,
        sourceText: card.sourceText,
        status: cardActions[card.id]
      }));
  }, [flashcards, cardActions]);

  // Save flashcards with their actions to the database
  const saveFlashcards = useCallback(async (): Promise<boolean> => {
    try {
      setIsSaving(true);

      // Get auth token
      const token = localStorage.getItem('auth-token');
      if (!token) {
        toast({
          variant: 'destructive',
          title: 'Authentication Required',
          description: 'Please log in again to save your flashcards.',
        });
        return false;
      }

      if (flashcardsWithActions.length === 0) {
        toast({
          title: 'No Actions to Save',
          description: 'Mark some flashcards first before saving.',
          variant: 'default',
        });
        return false;
      }

      // Prepare request data
      const requestData: FlashcardSaveRequest = {
        flashcards: flashcardsWithActions,
        taskId,
        pdfTitle
      };

      // Make API request
      const response = await fetch('/api/study/save-flashcards', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(requestData)
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to save flashcards');
      }

      if (!result.success) {
        throw new Error(result.error || 'Failed to save flashcards');
      }

      // Success feedback with detailed breakdown
      const savedBreakdown = flashcardsWithActions.reduce((acc, card) => {
        acc[card.status] = (acc[card.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const breakdownText = Object.entries(savedBreakdown)
        .map(([status, count]) => `${count} ${status}`)
        .join(', ');

      toast({
        title: 'Flashcards Saved! ✨',
        description: `Successfully saved ${result.data.savedCount} flashcards (${breakdownText}) to your collection.`,
        className: "animate-levelUp"
      });

      return true;

    } catch (error: unknown) {
      console.error('Save flashcards error:', error);

      let errorMessage = 'Failed to save flashcards. Please try again.';
      
      // Handle specific error types
      const err = error as Error;
      if (err.message?.includes('Authentication')) {
        errorMessage = 'Please log in again to continue.';
      } else if (err.message?.includes('validation')) {
        errorMessage = 'Invalid flashcard data. Please try again.';
      } else if (err.message) {
        errorMessage = err.message;
      }

      toast({
        variant: 'destructive',
        title: 'Save Failed',
        description: errorMessage,
      });

      return false;
    } finally {
      setIsSaving(false);
    }
  }, [flashcardsWithActions, taskId, pdfTitle, toast]);

  // Reset all actions
  const resetActions = useCallback(() => {
    setCardActions({});
    toast({
      title: 'Actions Reset',
      description: 'All flashcard actions have been cleared.',
    });
  }, [toast]);

  return {
    cardActions,
    actionStats,
    handleCardAction,
    saveFlashcards,
    isSaving,
    resetActions
  };
}