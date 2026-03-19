'use client';

import { useCallback, useEffect } from 'react';
import { useGamification } from '@/contexts/gamification-context';
import { CardAction } from '@/lib/models/flashcard';

interface FlashcardGamificationHook {
  // Points for flashcard actions
  addFlashcardGenerationPoints: (flashcardCount: number) => number;
  addFlashcardReviewPoints: (action: CardAction) => number;
  addFlashcardStudySessionPoints: (reviewedCount: number, knownCount: number) => number;
  
  // Quest and achievement tracking
  trackFlashcardGeneration: (flashcardCount: number) => void;
  trackFlashcardReview: (action: CardAction) => void;
  trackFlashcardMastery: (knownCount: number, totalCount: number) => void;
  
  // Badge earning
  checkFlashcardBadges: (stats: {
    total: number;
    known: number;
    review: number;
    studyStreak: number;
    recentActivity: number;
  }) => void;
}

export function useFlashcardGamification(): FlashcardGamificationHook {
  const {
    addPoints,
    earnBadge,
    checkQuestProgress,
    unlockAchievement,
  } = useGamification();

  // Points system for flashcard actions
  const addFlashcardGenerationPoints = useCallback((flashcardCount: number) => {
    // +3 points per flashcard generated
    const points = flashcardCount * 3;
    addPoints(points);
    return points;
  }, [addPoints]);

  const addFlashcardReviewPoints = useCallback((action: CardAction) => {
    let points = 0;
    switch (action) {
      case 'saved':
        points = 2; // +2 points for saving a flashcard for later review
        break;
      case 'known':
        points = 5; // +5 points for marking a flashcard as known (mastery)
        break;
      case 'review':
        points = 1; // +1 point for marking for review (engagement)
        break;
    }
    addPoints(points);
    return points;
  }, [addPoints]);

  const addFlashcardStudySessionPoints = useCallback((reviewedCount: number, knownCount: number) => {
    // Bonus points for completing flashcard review sessions
    const reviewBonus = reviewedCount * 2; // +2 points per card reviewed
    const masteryBonus = knownCount * 3; // +3 additional points per card mastered
    const totalPoints = reviewBonus + masteryBonus;
    addPoints(totalPoints);
    return totalPoints;
  }, [addPoints]);

  // Quest tracking for flashcard activities
  const trackFlashcardGeneration = useCallback((flashcardCount: number) => {
    // Track flashcard generation quest
    checkQuestProgress('flashcard-creator', flashcardCount);
    checkQuestProgress('ai-powered-learning', flashcardCount);
  }, [checkQuestProgress]);

  const trackFlashcardReview = useCallback((action: CardAction) => {
    // Track review-related quests
    checkQuestProgress('flashcard-reviewer', 1);
    
    if (action === 'known') {
      checkQuestProgress('knowledge-master', 1);
    }
  }, [checkQuestProgress]);

  const trackFlashcardMastery = useCallback((knownCount: number, totalCount: number) => {
    // Track mastery percentage achievements
    if (totalCount > 0) {
      const masteryPercentage = (knownCount / totalCount) * 100;
      
      if (masteryPercentage >= 50) {
        unlockAchievement('flashcard-apprentice');
      }
      if (masteryPercentage >= 80) {
        unlockAchievement('flashcard-expert');
      }
      if (masteryPercentage >= 95) {
        unlockAchievement('flashcard-master');
      }
    }
  }, [unlockAchievement]);

  // Badge checking based on flashcard statistics
  const checkFlashcardBadges = useCallback((stats: {
    total: number;
    known: number;
    review: number;
    studyStreak: number;
    recentActivity: number;
  }) => {
    // First flashcard badge
    if (stats.total >= 1) {
      earnBadge('first-flashcard');
    }
    
    // Flashcard collection badges
    if (stats.total >= 10) {
      earnBadge('flashcard-collector');
    }
    if (stats.total >= 50) {
      earnBadge('flashcard-hoarder');
    }
    if (stats.total >= 100) {
      earnBadge('flashcard-library');
    }
    
    // Knowledge mastery badges
    if (stats.known >= 25) {
      earnBadge('knowledge-seeker');
    }
    if (stats.known >= 100) {
      earnBadge('knowledge-master');
    }
    
    // Study consistency badges
    if (stats.studyStreak >= 7) {
      earnBadge('flashcard-streak-7');
    }
    if (stats.studyStreak >= 30) {
      earnBadge('flashcard-streak-30');
    }
    
    // Activity badges
    if (stats.recentActivity >= 20) {
      earnBadge('active-reviewer');
    }
  }, [earnBadge]);

  // Initialize flashcard-specific badges, quests, and achievements on first load
  useEffect(() => {
    // This would typically be done in the gamification context initialization
    // but we can check and add flashcard-specific items here if needed
    
    // Check if flashcard badges exist, if not, they should be added to the default badges
    // Note: Badge definitions moved to gamification context
    
    // Check if flashcard quests exist
    // Note: Quest definitions moved to gamification context
    
    // Check if flashcard achievements exist
    // Note: Achievement definitions moved to gamification context
    
    // Note: In a real implementation, these would be added to the default
    // badges, quests, and achievements in the gamification context
  }, []);

  return {
    addFlashcardGenerationPoints,
    addFlashcardReviewPoints,
    addFlashcardStudySessionPoints,
    trackFlashcardGeneration,
    trackFlashcardReview,
    trackFlashcardMastery,
    checkFlashcardBadges,
  };
}