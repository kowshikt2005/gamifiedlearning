'use client';

import React, { createContext, useContext, useState, ReactNode, useCallback, useEffect } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { 
  UserStats, 
  Achievement, 
  Quest, 
  Badge, 
  Challenge, 
  StudySession, 
  ActivePowerUp, 
  AVAILABLE_POWER_UPS,
  calculateLevelFromPoints,
  calculatePointsForNextLevel
} from '@/lib/models/gamification';

// Production-ready gamification context interface
interface GamificationContextType {
  // Core stats
  stats: UserStats | null;
  isLoading: boolean;
  error: string | null;
  
  // Computed values
  availablePowerUps: typeof AVAILABLE_POWER_UPS;
  activePowerUps: ActivePowerUp[];
  recentAchievements: Achievement[];
  activeQuests: Quest[];
  
  // Actions
  processStudySession: (sessionData: {
    taskName: string;
    duration: number;
    completedSuccessfully: boolean;
    quizScore?: number;
    aiQuestionsAsked?: number;
  }) => Promise<{ pointsEarned: number; levelUp: boolean; newAchievements: Achievement[] } | null>;
  
  processQuizCompletion: (quizData: {
    correctAnswers: number;
    wrongAnswers: number;
    answersRevealed: number;
    totalQuestions: number;
    timeSpent?: number;
  }) => Promise<{ pointsEarned: number; newAchievements: Achievement[] } | null>;
  
  purchasePowerUp: (powerUpId: string) => Promise<boolean>;
  consumeCoin: () => Promise<boolean>;
  refreshStats: () => Promise<void>;
  
  // Utility functions
  calculateLevelProgress: () => { current: number; needed: number; percentage: number };
  hasActivePowerUp: (effect: string) => boolean;
  getStreakCalendar: () => { date: string; hasStudy: boolean }[];
}

const GamificationContext = createContext<GamificationContextType | undefined>(undefined);

export function GamificationProvider({ children }: { children: ReactNode }) {
  const { user, getValidToken } = useAuth();
  
  // Production-ready state management
  const [stats, setStats] = useState<UserStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recentAchievements, setRecentAchievements] = useState<Achievement[]>([]);
  const [activeQuests, setActiveQuests] = useState<Quest[]>([]);

  // API call helper with error handling
  const apiCall = useCallback(async (endpoint: string, options: RequestInit = {}) => {
    const token = getValidToken();
    if (!token) {
      throw new Error('Authentication required');
    }

    const response = await fetch(endpoint, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP ${response.status}`);
    }

    return response.json();
  }, [getValidToken]);

  // Load user stats when user changes with data validation
  const refreshStats = useCallback(async () => {
    if (!user) {
      setStats(null);
      setRecentAchievements([]);
      setActiveQuests([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Fetch main stats
      const statsResponse = await apiCall('/api/user/gamification');
      
      // Validate stats data to prevent garbage values
      const statsData = statsResponse.data;
      if (statsData && typeof statsData.points === 'number' && statsData.points < 1000000) {
        // Only update if points seem reasonable (less than 1 million)
        setStats(statsData);

      } else {
        console.warn('⚠️ Suspicious stats data detected, not updating:', statsData);
        // Keep existing stats if new data seems corrupted
      }

      // Fetch recent achievements
      const achievementsResponse = await apiCall('/api/user/gamification/achievements');
      setRecentAchievements(achievementsResponse.data);

      // Fetch active quests
      const questsResponse = await apiCall('/api/user/gamification/quests');
      setActiveQuests(questsResponse.data);

    } catch (err) {
      console.error('Failed to load gamification stats:', err);
      setError(err instanceof Error ? err.message : 'Failed to load stats');
    } finally {
      setIsLoading(false);
    }
  }, [user, apiCall]);

  // Load stats when user changes
  useEffect(() => {
    refreshStats();
  }, [refreshStats]);

  // Process study session completion
  const processStudySession = useCallback(async (sessionData: {
    taskName: string;
    duration: number;
    completedSuccessfully: boolean;
    quizScore?: number;
    aiQuestionsAsked?: number;
  }) => {
    try {
      setIsLoading(true);
      const response = await apiCall('/api/user/gamification?action=study-session', {
        method: 'POST',
        body: JSON.stringify(sessionData),
      });

      // Refresh stats to get updated data
      await refreshStats();

      return response.data;
    } catch (err) {
      console.error('Failed to process study session:', err);
      setError(err instanceof Error ? err.message : 'Failed to process session');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [apiCall, refreshStats]);

  // Process quiz completion with duplicate prevention
  const processQuizCompletion = useCallback(async (quizData: {
    correctAnswers: number;
    wrongAnswers: number;
    answersRevealed: number;
    totalQuestions: number;
    timeSpent?: number;
  }) => {
    try {
      setIsLoading(true);
      
      // Add unique session identifier to prevent duplicate processing
      const sessionId = `quiz_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
      const quizDataWithId = {
        ...quizData,
        sessionId
      };
      
      const response = await apiCall('/api/user/gamification?action=quiz-completion', {
        method: 'POST',
        body: JSON.stringify(quizDataWithId),
      });

      // Don't auto-refresh here to prevent garbage values in UI
      // Stats will be refreshed when user navigates back to dashboard
      
      return response.data;
    } catch (err) {
      console.error('Failed to process quiz completion:', err);
      setError(err instanceof Error ? err.message : 'Failed to process quiz');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [apiCall]);

  // Purchase power-up
  const purchasePowerUp = useCallback(async (powerUpId: string) => {
    try {
      setIsLoading(true);
      await apiCall('/api/user/gamification?action=purchase-powerup', {
        method: 'POST',
        body: JSON.stringify({ powerUpId }),
      });

      // Refresh stats to get updated data
      await refreshStats();
      return true;
    } catch (err) {
      console.error('Failed to purchase power-up:', err);
      setError(err instanceof Error ? err.message : 'Failed to purchase power-up');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [apiCall, refreshStats]);

  // Consume coin for answer reveal
  const consumeCoin = useCallback(async () => {
    try {
      await apiCall('/api/user/gamification?action=use-coin', {
        method: 'POST',
      });

      // Refresh stats to get updated coin count
      await refreshStats();
      return true;
    } catch (err) {
      console.error('Failed to consume coin:', err);
      setError(err instanceof Error ? err.message : 'Failed to consume coin');
      return false;
    }
  }, [apiCall, refreshStats]);

  // Utility functions
  const calculateLevelProgress = useCallback(() => {
    if (!stats) return { current: 0, needed: 100, percentage: 0 };
    
    const needed = calculatePointsForNextLevel(stats.level, stats.points);
    const pointsForCurrentLevel = 100 + (stats.level - 1) * 50;
    const current = pointsForCurrentLevel - needed;
    const percentage = (current / pointsForCurrentLevel) * 100;
    
    return { current, needed, percentage };
  }, [stats]);

  const hasActivePowerUp = useCallback((effect: string) => {
    if (!stats) return false;
    return stats.activePowerUps.some(
      powerUp => powerUp.effect === effect && powerUp.expiresAt > new Date()
    );
  }, [stats]);

  const getStreakCalendar = useCallback(() => {
    if (!stats) return [];
    
    const calendar: { date: string; hasStudy: boolean }[] = [];
    const today = new Date();
    
    // Generate last 30 days
    for (let i = 29; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateString = date.toISOString().split('T')[0];
      
      calendar.push({
        date: dateString,
        hasStudy: stats.streak.streakDates.includes(dateString)
      });
    }
    
    return calendar;
  }, [stats]);

  // Computed values
  const activePowerUps = stats?.activePowerUps.filter(
    powerUp => powerUp.expiresAt > new Date()
  ) || [];

  const contextValue: GamificationContextType = {
    // Core stats
    stats,
    isLoading,
    error,
    
    // Computed values
    availablePowerUps: AVAILABLE_POWER_UPS,
    activePowerUps,
    recentAchievements,
    activeQuests,
    
    // Actions
    processStudySession,
    processQuizCompletion,
    purchasePowerUp,
    consumeCoin,
    refreshStats,
    
    // Utility functions
    calculateLevelProgress,
    hasActivePowerUp,
    getStreakCalendar,
  };

  return (
    <GamificationContext.Provider value={contextValue}>
      {children}
    </GamificationContext.Provider>
  );
}

export function useGamification() {
  const context = useContext(GamificationContext);
  if (context === undefined) {
    throw new Error('useGamification must be used within a GamificationProvider');
  }
  return context;
}

// Legacy compatibility exports (for existing components)
export type { Badge, Quest, Achievement, Challenge, StudySession, ActivePowerUp };

// Legacy function exports for backward compatibility
export const legacyCompatibility = {
  calculateLevelFromPoints,
  calculatePointsForNextLevel,
};