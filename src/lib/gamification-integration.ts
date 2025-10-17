/**
 * Production-ready gamification integration utilities
 * This file provides helper functions for integrating gamification throughout the app
 */

import { GamificationService } from '@/lib/services/gamification-service';

/**
 * Integration helper for study session completion
 * Call this when a user completes a study session
 */
export async function handleStudySessionComplete(
  userId: string,
  sessionData: {
    taskName: string;
    duration: number;
    completedSuccessfully: boolean;
    quizScore?: number;
    aiQuestionsAsked?: number;
  }
) {
  try {
    const result = await GamificationService.processStudySession(userId, sessionData);
    
    // Return results for UI feedback
    return {
      success: true,
      pointsEarned: result.pointsEarned,
      levelUp: result.levelUp,
      newAchievements: result.newAchievements,
      message: result.levelUp 
        ? `🎉 Level up! You earned ${result.pointsEarned} points and reached a new level!`
        : `✨ Great job! You earned ${result.pointsEarned} points!`
    };
  } catch (error) {
    console.error('Failed to process study session:', error);
    return {
      success: false,
      error: 'Unable to update your progress. Please try again.'
    };
  }
}

/**
 * Integration helper for quiz completion
 * Call this when a user completes a quiz
 */
export async function handleQuizComplete(
  userId: string,
  quizData: {
    correctAnswers: number;
    wrongAnswers: number;
    answersRevealed: number;
    totalQuestions: number;
    timeSpent?: number;
  }
) {
  try {
    const result = await GamificationService.processQuizCompletion(userId, quizData);
    
    const accuracy = (quizData.correctAnswers / quizData.totalQuestions) * 100;
    
    return {
      success: true,
      pointsEarned: result.pointsEarned,
      newAchievements: result.newAchievements,
      accuracy,
      message: accuracy === 100 
        ? `🏆 Perfect score! You earned ${result.pointsEarned} points!`
        : `📝 Quiz complete! You earned ${result.pointsEarned} points with ${accuracy.toFixed(0)}% accuracy!`
    };
  } catch (error) {
    console.error('Failed to process quiz completion:', error);
    return {
      success: false,
      error: 'Unable to update your quiz progress. Please try again.'
    };
  }
}

/**
 * Integration helper for AI chat interactions
 * Call this when a user asks a question to the AI
 */
export async function handleAIChatMessage(userId: string) {
  try {
    // This would trigger quest progress for AI chat quests
    // Implementation depends on how AI chat is tracked
    const stats = await GamificationService.getUserStats(userId);
    if (!stats) return { success: false };
    
    // Update AI chat quest progress
    const updatedQuests = stats.quests.map(quest => {
      if (quest.id === 'ai-chat-10' && !quest.completed) {
        const newProgress = Math.min(quest.progress + 1, quest.target);
        return {
          ...quest,
          progress: newProgress,
          completed: newProgress >= quest.target,
          completedAt: newProgress >= quest.target ? new Date() : quest.completedAt
        };
      }
      return quest;
    });
    
    await GamificationService.updateUserStats(userId, { quests: updatedQuests });
    
    return { success: true };
  } catch (error) {
    console.error('Failed to process AI chat message:', error);
    return { success: false };
  }
}

/**
 * Integration helper for daily goal checking
 * Call this periodically or when user activity is detected
 */
export async function checkDailyGoalProgress(userId: string) {
  try {
    const stats = await GamificationService.getUserStats(userId);
    if (!stats) return { success: false };
    
    // Check if daily goal is met
    const goalMet = stats.dailyProgress >= stats.dailyGoal;
    
    if (goalMet) {
      // Update daily goal quest progress
      const updatedQuests = stats.quests.map(quest => {
        if (quest.id === 'daily-goal-7' && !quest.completed) {
          const newProgress = Math.min(quest.progress + 1, quest.target);
          return {
            ...quest,
            progress: newProgress,
            completed: newProgress >= quest.target,
            completedAt: newProgress >= quest.target ? new Date() : quest.completedAt
          };
        }
        return quest;
      });
      
      await GamificationService.updateUserStats(userId, { quests: updatedQuests });
    }
    
    return { 
      success: true, 
      goalMet,
      progress: stats.dailyProgress,
      goal: stats.dailyGoal
    };
  } catch (error) {
    console.error('Failed to check daily goal progress:', error);
    return { success: false };
  }
}

/**
 * Integration helper for power-up purchase
 * Call this when user wants to buy a power-up
 */
export async function handlePowerUpPurchase(userId: string, powerUpId: string) {
  try {
    const success = await GamificationService.purchasePowerUp(userId, powerUpId);
    
    if (success) {
      return {
        success: true,
        message: '✨ Power-up activated! Enjoy your boost!'
      };
    } else {
      return {
        success: false,
        error: 'Unable to purchase power-up. Check your points balance.'
      };
    }
  } catch (error) {
    console.error('Failed to purchase power-up:', error);
    return {
      success: false,
      error: 'Unable to purchase power-up. Please try again.'
    };
  }
}

/**
 * Integration helper for coin usage (answer reveals)
 * Call this when user wants to reveal an answer
 */
export async function handleCoinUsage(userId: string) {
  try {
    const success = await GamificationService.consumeCoin(userId);
    
    if (success) {
      return {
        success: true,
        message: '💡 Answer revealed! Coin used.'
      };
    } else {
      return {
        success: false,
        error: 'Daily coin limit reached. Try again tomorrow!'
      };
    }
  } catch (error) {
    console.error('Failed to use coin:', error);
    return {
      success: false,
      error: 'Unable to use coin. Please try again.'
    };
  }
}

/**
 * Get user's current gamification summary for dashboard
 */
export async function getUserGamificationSummary(userId: string) {
  try {
    const stats = await GamificationService.getUserStats(userId);
    if (!stats) return null;
    
    const recentAchievements = await GamificationService.getRecentAchievements(userId);
    const activeQuests = await GamificationService.getActiveQuests(userId);
    
    return {
      level: stats.level,
      points: stats.points,
      streak: stats.streak.currentStreak,
      dailyProgress: stats.dailyProgress,
      dailyGoal: stats.dailyGoal,
      totalStudyTime: stats.totalStudyTime,
      coins: stats.coins,
      recentAchievements,
      activeQuests,
      earnedBadges: stats.badges.filter(b => b.earned).length,
      totalBadges: stats.badges.length,
      activePowerUps: stats.activePowerUps.filter(p => p.expiresAt > new Date())
    };
  } catch (error) {
    console.error('Failed to get gamification summary:', error);
    return null;
  }
}