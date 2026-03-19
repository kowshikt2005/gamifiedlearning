'use client';

import React, { createContext, useContext, useState, ReactNode, useCallback, useEffect } from 'react';
import { useAuth } from '@/contexts/auth-context';

// Types for our gamification system
export type Badge = {
  id: string;
  name: string;
  description: string;
  icon: string;
  earned: boolean;
  earnedAt?: Date;
  rarity?: 'common' | 'rare' | 'epic' | 'legendary';
};

export type PowerUp = {
  id: string;
  name: string;
  description: string;
  icon: string;
  active: boolean;
  duration: number; // in seconds
  endTime?: Date;
  multiplier?: number; // for point multipliers
};

export type Quest = {
  id: string;
  name: string;
  description: string;
  icon: string;
  progress: number;
  target: number;
  reward: number;
  completed: boolean;
  completedAt?: Date;
  category?: string;
};

export type Challenge = {
  id: string;
  name: string;
  description: string;
  icon: string;
  reward: number;
  completed: boolean;
  completedAt?: Date;
  difficulty?: 'easy' | 'medium' | 'hard';
};

export type Achievement = {
  id: string;
  name: string;
  description: string;
  icon: string;
  earned: boolean;
  earnedAt?: Date;
  points: number;
};

interface GamificationContextType {
  points: number;
  level: number;
  streak: number;
  coins: number; // Tracks answer reveals in quiz
  badges: Badge[];
  powerUps: PowerUp[];
  quests: Quest[];
  challenges: Challenge[];
  achievements: Achievement[];
  dailyGoal: number;
  dailyProgress: number;
  totalStudyTime: number;

  // Actions
  addPoints: (amount: number) => void;
  addStudySessionPoints: (minutes: number, completedSuccessfully: boolean, has2xPowerUp?: boolean) => number;
  addQuizPoints: (correctAnswers: number, wrongAnswers: number, answersRevealed: number) => number;

  buyPowerUp: (powerUpId: string) => boolean;
  incrementStreak: () => void;
  resetStreak: () => void;
  earnBadge: (badgeId: string) => void;
  activatePowerUp: (powerUpId: string) => void;
  completeQuest: (questId: string) => void;
  completeChallenge: (challengeId: string) => void;
  updateDailyProgress: (amount: number) => void;
  checkQuestProgress: (questId: string, progress: number) => void;
  addStudyTime: (minutes: number) => void;
  unlockAchievement: (achievementId: string) => void;
  calculateLevelFromPoints: (totalPoints: number) => number;
  calculatePointsForNextLevel: (currentLevel: number, currentPoints: number) => number;
  useCoin: () => boolean; // Returns false if coins >= 3
  resetCoins: () => void; // Reset coins for new quiz
  syncToDatabase: () => Promise<boolean>; // Manual sync to database
  fetchLatestProgress: () => Promise<boolean>; // Fetch latest from database
}

// Default data arrays (moved outside component to prevent recreation)
const DEFAULT_BADGES: Badge[] = [
  { id: 'first-quiz', name: 'Pop Quiz!', description: 'Took your first quiz', icon: '🎓', earned: false, rarity: 'common' },
  { id: 'streak-7', name: 'On a Roll', description: 'Kept a 7-day study streak', icon: '🔥', earned: false, rarity: 'rare' },
  { id: 'points-100', name: 'Centurion', description: 'Racked up 100 points', icon: '💯', earned: false, rarity: 'common' },
  { id: 'perfect-score', name: 'Flawless', description: 'Aced a quiz with 100%', icon: '🏆', earned: false, rarity: 'rare' },
  { id: 'early-bird', name: 'Early Bird', description: 'Hit the books before 8 AM', icon: '🐦', earned: false, rarity: 'common' },
  { id: 'night-owl', name: 'Night Owl', description: 'Burned the midnight oil past 10 PM', icon: '🦉', earned: false, rarity: 'common' },
  { id: 'speed-demon', name: 'Quick Draw', description: 'Blazed through a quiz in under 5 minutes', icon: '⚡', earned: false, rarity: 'epic' },
  { id: 'scholar', name: 'Bookworm', description: 'Knocked out 10 quizzes', icon: '📚', earned: false, rarity: 'epic' },
  { id: 'first-flashcard', name: 'Building Blocks', description: 'Made your first flashcard', icon: '📇', earned: false, rarity: 'common' },
  { id: 'flashcard-collector', name: 'Deck Builder', description: 'Created 10 flashcards', icon: '🗂️', earned: false, rarity: 'common' },
  { id: 'flashcard-hoarder', name: 'Stacked Deck', description: 'Built up 50 flashcards', icon: '📚', earned: false, rarity: 'rare' },
  { id: 'flashcard-library', name: 'Walking Encyclopedia', description: 'Amassed 100 flashcards', icon: '🏛️', earned: false, rarity: 'epic' },
  { id: 'knowledge-seeker', name: 'Deep Diver', description: 'Mastered 25 flashcards', icon: '🔍', earned: false, rarity: 'rare' },
  { id: 'knowledge-master', name: 'Total Recall', description: 'Mastered 100 flashcards', icon: '🧠', earned: false, rarity: 'epic' },
  { id: 'flashcard-streak-7', name: 'Daily Grind', description: 'Reviewed flashcards 7 days straight', icon: '🔥', earned: false, rarity: 'rare' },
  { id: 'flashcard-streak-30', name: 'Iron Will', description: 'Reviewed flashcards for 30 days straight', icon: '🏃', earned: false, rarity: 'legendary' },
  { id: 'active-reviewer', name: 'Cram Session', description: 'Reviewed 20+ cards in one week', icon: '⚡', earned: false, rarity: 'rare' },
];

const DEFAULT_QUESTS: Quest[] = [
  { id: 'study-60', name: 'The Long Haul', description: 'Put in a full 60 minutes of study', icon: '⏰', progress: 0, target: 60, completed: false, reward: 50 },
  { id: 'quiz-5', name: 'Five for Five', description: 'Complete 5 quizzes', icon: '📝', progress: 0, target: 5, completed: false, reward: 75 },
  { id: 'ai-chat-10', name: 'Curious Mind', description: 'Ask 10 questions in chat', icon: '💬', progress: 0, target: 10, completed: false, reward: 30 },
  { id: 'streak-30', name: 'No Days Off', description: 'Keep a 30-day study streak', icon: '🗓️', progress: 0, target: 30, completed: false, reward: 200 },
  { id: 'create-flashcards-10', name: 'Craft a Deck', description: 'Create 10 flashcards', icon: '📇', progress: 0, target: 10, completed: false, reward: 25 },
  { id: 'master-flashcards-20', name: 'Lock It In', description: 'Master 20 flashcards', icon: '🎯', progress: 0, target: 20, completed: false, reward: 40 },
  { id: 'review-streak-7', name: 'Steady Hands', description: 'Review flashcards for 7 days', icon: '🔄', progress: 0, target: 7, completed: false, reward: 35 },
];

const DEFAULT_ACHIEVEMENTS: Achievement[] = [
  { id: 'first-session', name: 'Off the Bench', description: 'Completed your first study session', icon: '🎯', earned: false, points: 25 },
  { id: 'marathon-study', name: 'Deep Focus', description: 'Studied for 2 hours straight', icon: '🏃', earned: false, points: 50 },
  { id: 'consistent-week', name: 'Clockwork', description: 'Studied every day for a full week', icon: '📅', earned: false, points: 75 },
  { id: 'quiz-expert', name: 'Honor Roll', description: 'Scored 90%+ on 5 quizzes', icon: '📝', earned: false, points: 100 },
  { id: 'flashcard-apprentice', name: 'Picking Up Steam', description: 'Mastered half your flashcards', icon: '🎓', earned: false, points: 50 },
  { id: 'flashcard-expert', name: 'Second Nature', description: 'Mastered 80% of your flashcards', icon: '🏆', earned: false, points: 100 },
  { id: 'flashcard-master', name: 'Full Circle', description: 'Mastered 95% of your flashcards', icon: '👑', earned: false, points: 200 },
  { id: 'ai-learning-pioneer', name: 'Study Hacker', description: 'Generated 100 flashcards', icon: '🚀', earned: false, points: 150 },
];

/**
 * Merge DB data with code defaults: code is authoritative for metadata
 * (name, description, icon, etc.), DB is authoritative for progress
 * (earned, progress, completed, earnedAt, completedAt).
 * Also adds any new items from defaults that don't exist in DB yet.
 */
function mergeBadges(dbBadges: Badge[], defaults: Badge[]): Badge[] {
  const defaultMap = new Map(defaults.map(b => [b.id, b]));
  const dbMap = new Map(dbBadges.map(b => [b.id, b]));

  // Start with all defaults (ensures new badges are included)
  const merged = defaults.map(def => {
    const db = dbMap.get(def.id);
    if (db) {
      // Merge: code metadata + DB progress
      return { ...def, earned: db.earned, ...(db.earnedAt && { earnedAt: db.earnedAt }) };
    }
    return def;
  });

  // Include any DB-only badges not in defaults (legacy)
  for (const db of dbBadges) {
    if (!defaultMap.has(db.id)) {
      merged.push(db);
    }
  }

  return merged;
}

function mergeQuests(dbQuests: Quest[], defaults: Quest[]): Quest[] {
  const defaultMap = new Map(defaults.map(q => [q.id, q]));
  const dbMap = new Map(dbQuests.map(q => [q.id, q]));

  const merged = defaults.map(def => {
    const db = dbMap.get(def.id);
    if (db) {
      return {
        ...def,
        progress: db.progress,
        completed: db.completed,
        ...(db.completedAt && { completedAt: db.completedAt }),
      };
    }
    return def;
  });

  for (const db of dbQuests) {
    if (!defaultMap.has(db.id)) {
      merged.push(db);
    }
  }

  return merged;
}

function mergeAchievements(dbAchievements: Achievement[], defaults: Achievement[]): Achievement[] {
  const defaultMap = new Map(defaults.map(a => [a.id, a]));
  const dbMap = new Map(dbAchievements.map(a => [a.id, a]));

  const merged = defaults.map(def => {
    const db = dbMap.get(def.id);
    if (db) {
      return { ...def, earned: db.earned, ...(db.earnedAt && { earnedAt: db.earnedAt }) };
    }
    return def;
  });

  for (const db of dbAchievements) {
    if (!defaultMap.has(db.id)) {
      merged.push(db);
    }
  }

  return merged;
}

const GamificationContext = createContext<GamificationContextType | undefined>(undefined);

export function GamificationProvider({ children }: { children: ReactNode }) {
  const { user, getValidToken } = useAuth();
  const [points, setPoints] = useState(0);
  const [level, setLevel] = useState(1);
  const [streak, setStreak] = useState(0);
  const [coins, setCoins] = useState(0); // Tracks answer reveals in quiz
  const [dailyGoal, setDailyGoal] = useState(30); // 30 minutes default
  const [dailyProgress, setDailyProgress] = useState(0);
  const [totalStudyTime, setTotalStudyTime] = useState(0);

  const [badges, setBadges] = useState<Badge[]>(DEFAULT_BADGES);

  // Initialize power-ups
  const [powerUps, setPowerUps] = useState<PowerUp[]>([
    { id: 'double-points', name: 'Happy Hour', description: 'Earn 2x points for 30 minutes', icon: '✨', active: false, duration: 1800, multiplier: 2 },
    { id: 'time-extension', name: 'Overtime', description: 'Add 10 minutes to your study session', icon: '⏰', active: false, duration: 0 },
    { id: 'hint-revealer', name: 'Lifeline', description: 'Reveal one correct answer per quiz', icon: '💡', active: false, duration: 1800 },
    { id: 'focus-mode', name: 'Tunnel Vision', description: 'Block out distractions for 1 hour', icon: '🎯', active: false, duration: 3600 },
  ]);

  const [quests, setQuests] = useState<Quest[]>(DEFAULT_QUESTS);

  // Initialize challenges
  const [challenges, setChallenges] = useState<Challenge[]>([
    { id: 'speed-quiz', name: 'Beat the Clock', description: 'Finish a quiz in under 3 minutes', icon: '🏃', reward: 30, completed: false, difficulty: 'medium' },
    { id: 'perfect-day', name: 'Zero Distractions', description: 'Hit your daily goal without interruptions', icon: '⭐', reward: 45, completed: false, difficulty: 'hard' },
    { id: 'ai-master', name: 'Question Everything', description: 'Ask 5 questions in one study session', icon: '💬', reward: 35, completed: false, difficulty: 'medium' },
    { id: 'early-riser', name: 'Before Dawn', description: 'Start studying before 6 AM', icon: '🌅', reward: 25, completed: false, difficulty: 'easy' },
  ]);

  const [achievements, setAchievements] = useState<Achievement[]>(DEFAULT_ACHIEVEMENTS);

  // Sync with database when user changes
  useEffect(() => {
    if (user) {
      // Safely access user.progress with fallbacks
      const progress = user.progress || {};
      setPoints(progress.points || 0);
      setLevel(progress.level || 1);
      setStreak(progress.streak || 0);
      setCoins(0); // Reset coins for each session
      setTotalStudyTime(progress.totalStudyTime || 0);
      setDailyGoal(progress.dailyGoal || 30);
      // Merge DB data with code defaults: code owns metadata, DB owns progress
      setBadges(progress.badges ? mergeBadges(progress.badges, DEFAULT_BADGES) : DEFAULT_BADGES);
      setQuests(progress.quests ? mergeQuests(progress.quests, DEFAULT_QUESTS) : DEFAULT_QUESTS);
      setAchievements(progress.achievements ? mergeAchievements(progress.achievements, DEFAULT_ACHIEVEMENTS) : DEFAULT_ACHIEVEMENTS);

      // Calculate daily progress (today's study time)
      if (progress.studySessions) {
        const today = new Date().toISOString().split('T')[0];
        const todaysSessions = progress.studySessions.filter(
          (session: { completedAt?: Date | string; duration?: number }) => 
            session.completedAt && session.completedAt.toString().split('T')[0] === today
        );
        const todaysTime = todaysSessions.reduce((total: number, session: { duration?: number }) => 
          total + (session.duration || 0), 0);
        setDailyProgress(Math.min(todaysTime, progress.dailyGoal || 30));
      }
    } else {
      // Reset to default values when no user or progress
      setPoints(0);
      setLevel(1);
      setStreak(0);
      setCoins(0);
      setTotalStudyTime(0);
      setDailyGoal(30);
      setDailyProgress(0);
      setBadges(DEFAULT_BADGES);
      setQuests(DEFAULT_QUESTS);
      setAchievements(DEFAULT_ACHIEVEMENTS);
    }
  }, [user]); // Remove array dependencies that change on every render

  // Real-time sync progress to database with validation
  const syncToDatabase = useCallback(async () => {
    if (!user) {
      console.warn('No user found, skipping sync');
      return false;
    }

    try {
      const token = getValidToken();
      if (!token) {
        console.warn('No valid auth token found, cannot sync progress');
        return false;
      }

      // Format data according to database schema with strict validation
      const progressData = {
        points: Math.max(0, Math.floor(points || 0)),
        level: Math.max(1, Math.floor(level || 1)),
        streak: Math.max(0, Math.floor(streak || 0)),
        totalStudyTime: Math.max(0, Math.floor(totalStudyTime || 0)),
        dailyGoal: Math.max(1, Math.floor(dailyGoal || 30)),
        badges: (badges || []).map((badge: Badge) => ({
          id: String(badge.id || ''),
          name: String(badge.name || ''),
          description: String(badge.description || ''),
          icon: String(badge.icon || ''),
          earned: Boolean(badge.earned),
          ...(badge.earnedAt && { earnedAt: new Date(badge.earnedAt) }),
          ...(badge.rarity && { rarity: badge.rarity })
        })),
        quests: (quests || []).map((quest: Quest) => ({
          id: String(quest.id || ''),
          name: String(quest.name || ''),
          description: String(quest.description || ''),
          icon: String(quest.icon || ''),
          progress: Math.max(0, Math.floor(quest.progress || 0)),
          target: Math.max(1, Math.floor(quest.target || 1)),
          reward: Math.max(0, Math.floor(quest.reward || 0)),
          completed: Boolean(quest.completed),
          ...(quest.completedAt && { completedAt: new Date(quest.completedAt) }),
          ...(quest.category && { category: String(quest.category) })
        })),
        achievements: (achievements || []).map((achievement: Achievement) => ({
          id: String(achievement.id || ''),
          name: String(achievement.name || ''),
          description: String(achievement.description || ''),
          icon: String(achievement.icon || ''),
          earned: Boolean(achievement.earned),
          ...(achievement.earnedAt && { earnedAt: new Date(achievement.earnedAt) }),
          points: Math.max(0, Math.floor(achievement.points || 0))
        })),
        lastStudyDate: new Date(),
        updatedAt: new Date()
      };

      // Syncing progress to database

      const response = await fetch('/api/user/progress', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(progressData),
      });

      if (!response.ok) {
        const errorData = await response.text();
        console.error('❌ Failed to sync progress:', response.status, errorData);
        return false;
      } else {
        // Progress synced successfully
        return true;
      }
    } catch (error) {
      console.error('❌ Error syncing progress:', error);
      return false;
    }
  }, [user, points, level, streak, totalStudyTime, dailyGoal, badges, quests, achievements, getValidToken]);

  // Fetch latest progress from database for real-time sync
  const [lastFetchTime, setLastFetchTime] = useState(0);

  const fetchLatestProgress = useCallback(async () => {
    if (!user) return false;

    // Prevent excessive API calls - minimum 5 seconds between fetches
    const now = Date.now();
    if (now - lastFetchTime < 5000) {
      // Skipping fetch - too soon since last call
      return false;
    }

    setLastFetchTime(now);

    try {
      const token = getValidToken();
      if (!token) return false;

      const response = await fetch('/api/user/progress', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        const progress = data.progress;

        if (progress) {
          // Successfully fetched latest progress from database

          // Update local state with database values
          setPoints(progress.points || 0);
          setLevel(progress.level || 1);
          setStreak(progress.streak || 0);
          setTotalStudyTime(progress.totalStudyTime || 0);
          setDailyGoal(progress.dailyGoal || 30);
          // Merge DB data with code defaults: code owns metadata, DB owns progress
          setBadges(progress.badges ? mergeBadges(progress.badges, DEFAULT_BADGES) : DEFAULT_BADGES);
          setQuests(progress.quests ? mergeQuests(progress.quests, DEFAULT_QUESTS) : DEFAULT_QUESTS);
          setAchievements(progress.achievements ? mergeAchievements(progress.achievements, DEFAULT_ACHIEVEMENTS) : DEFAULT_ACHIEVEMENTS);

          return true;
        }
      }
    } catch (error) {
      console.error('❌ Error fetching latest progress:', error);
    }
    return false;
  }, [user, getValidToken, lastFetchTime]); // Removed array dependencies

  // Smart sync strategy - only sync when data actually changes
  const [lastSyncTime, setLastSyncTime] = useState(0);
  const [lastSyncedData, setLastSyncedData] = useState<string>('');
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  useEffect(() => {
    if (user && points >= 0 && !isInitialLoad) {
      // Create a hash of current data to detect actual changes
      const currentData = JSON.stringify({ points, level, streak, totalStudyTime });

      // Only sync if data actually changed and enough time has passed
      const now = Date.now();
      const hasDataChanged = currentData !== lastSyncedData;
      const enoughTimePassed = now - lastSyncTime > 15000; // 15 seconds minimum

      if (hasDataChanged && enoughTimePassed) {
        const timeoutId = setTimeout(() => {
          syncToDatabase().then(() => {
            setLastSyncTime(Date.now());
            setLastSyncedData(currentData);
          });
        }, 2000); // 2 second debounce

        return () => clearTimeout(timeoutId);
      }
    }
  }, [user, points, level, streak, totalStudyTime, syncToDatabase, lastSyncTime, lastSyncedData, isInitialLoad]);

  // Mark initial load as complete after first render
  useEffect(() => {
    if (isInitialLoad && user) {
      const timer = setTimeout(() => {
        setIsInitialLoad(false);
      }, 3000); // Wait 3 seconds before enabling auto-sync

      return () => clearTimeout(timer);
    }
  }, [isInitialLoad, user]);

  // Single useEffect for both initial fetch and periodic sync
  useEffect(() => {
    if (!user) return;

    // Initial fetch - only once per user session
    let hasInitialFetch = false;

    const performInitialFetch = async () => {
      if (!hasInitialFetch && user.progress) {
        hasInitialFetch = true;
        await fetchLatestProgress();
      }
    };

    // Perform initial fetch immediately
    performInitialFetch();

    // Set up periodic sync (every 10 minutes)
    const interval = setInterval(() => {
      fetchLatestProgress();
    }, 600000); // 10 minutes

    return () => {
      clearInterval(interval);
      hasInitialFetch = false;
    };
  }, [user?._id]); // Only depend on user ID, not the entire user object or fetchLatestProgress

  // Level calculation based on points - CORRECTED SYSTEM
  // Level 1: 100 points, Level 2: 150 points, Level 3: 200 points (+50 for each level)
  const calculateLevelFromPoints = useCallback((totalPoints: number) => {
    if (totalPoints < 100) return 1;

    let currentLevel = 1;
    let pointsUsed = 0;
    let pointsForNextLevel = 100; // Points needed for level 2

    while (pointsUsed + pointsForNextLevel <= totalPoints) {
      pointsUsed += pointsForNextLevel;
      currentLevel++;
      pointsForNextLevel = 100 + (currentLevel - 1) * 50; // Level 2=150, Level 3=200, etc.
    }

    return currentLevel;
  }, []);

  // Calculate points needed for next level
  const calculatePointsForNextLevel = useCallback((currentLevel: number, currentPoints: number) => {
    let pointsUsed = 0;

    // Calculate total points used for all previous levels
    for (let level = 1; level < currentLevel; level++) {
      if (level === 1) {
        pointsUsed += 100;
      } else {
        pointsUsed += 100 + (level - 1) * 50;
      }
    }

    // Points needed for next level
    const pointsForNextLevel = 100 + (currentLevel - 1) * 50;
    const pointsInCurrentLevel = currentPoints - pointsUsed;

    return pointsForNextLevel - pointsInCurrentLevel;
  }, []);

  // Define earnBadge first to avoid dependency issues
  const earnBadge = useCallback((badgeId: string) => {
    setBadges((prev: Badge[]) => prev.map((badge: Badge) =>
      badge.id === badgeId && !badge.earned
        ? { ...badge, earned: true, earnedAt: new Date() }
        : badge
    ));
  }, []);

  // Level up system — update level from points, award badge, but no bonus points
  // (Bonus points here caused a cascading loop: +100 → recalc level → +100 → ...)
  useEffect(() => {
    const newLevel = calculateLevelFromPoints(points);
    if (newLevel !== level) {
      setLevel(newLevel);

      // Award level up badge
      if (newLevel >= 5) {
        earnBadge('scholar');
      }
    }
  }, [points, level, calculateLevelFromPoints, earnBadge]);

  // Check for point-based badges
  useEffect(() => {
    if (points >= 100) {
      earnBadge('points-100');
    }
  }, [points, earnBadge]);

  // Check for streak badges
  useEffect(() => {
    if (streak >= 7) {
      earnBadge('streak-7');
    }
  }, [streak, earnBadge]);

  // Power-up timer — only update state when a power-up actually expires
  useEffect(() => {
    const interval = setInterval(() => {
      setPowerUps((prev: PowerUp[]) => {
        const now = new Date();
        let changed = false;
        const next = prev.map((powerUp: PowerUp) => {
          if (powerUp.active && powerUp.endTime && now >= powerUp.endTime) {
            changed = true;
            return { ...powerUp, active: false, endTime: undefined };
          }
          return powerUp;
        });
        return changed ? next : prev; // same reference = no re-render
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Actions - Updated according to new point system
  const addPoints = useCallback((amount: number) => {
    // Check for active 2x power-up
    const doublePointsActive = powerUps.some((p: PowerUp) => p.id === 'double-points' && p.active);
    const actualAmount = doublePointsActive ? amount * 2 : amount;
    setPoints((prev: number) => Math.max(0, prev + actualAmount)); // Prevent negative points
  }, [powerUps]);

  // Study session points according to new system
  // Note: addPoints already applies the 2x power-up multiplier, so we don't double it here
  const addStudySessionPoints = useCallback((minutes: number, completedSuccessfully: boolean, _has2xPowerUp: boolean = false) => {
    if (completedSuccessfully) {
      // If session completed successfully then time in minutes * 5 points to be added
      const pointsEarned = minutes * 5;
      addPoints(pointsEarned);
      return pointsEarned;
    } else {
      // If session ended before then -25 points
      addPoints(-25);
      return -25;
    }
  }, [addPoints]);



  // Quiz points according to new system
  const addQuizPoints = useCallback((correctAnswers: number, wrongAnswers: number, answersRevealed: number) => {
    // For every correct answer +5 points
    const correctPoints = correctAnswers * 5;
    // For every wrong answer -1 point
    const wrongPoints = wrongAnswers * -1;
    // If answer revealed then -10 points
    const revealedPoints = answersRevealed * -10;

    const totalPoints = correctPoints + wrongPoints + revealedPoints;
    addPoints(totalPoints);
    return totalPoints;
  }, [addPoints]);

  const activatePowerUp = useCallback((powerUpId: string) => {
    setPowerUps((prev: PowerUp[]) => prev.map((powerUp: PowerUp) => {
      if (powerUp.id === powerUpId) {
        if (powerUp.duration > 0) {
          const endTime = new Date();
          endTime.setSeconds(endTime.getSeconds() + powerUp.duration);
          return { ...powerUp, active: true, endTime };
        } else {
          // Instant power-up (like time extension)
          return { ...powerUp, active: false };
        }
      }
      return powerUp;
    }));
  }, []);

  // Power-up purchases - deduct 100 points
  const buyPowerUp = useCallback((powerUpId: string) => {
    const powerUpCost = 100; // If user buys a powerup then deduct 100 points

    if (points >= powerUpCost) {
      setPoints((prev: number) => prev - powerUpCost);
      activatePowerUp(powerUpId);
      return true;
    }
    return false;
  }, [points, activatePowerUp]);

  // Streak system - if study session created for sequential calendar days then streak is increased
  // Uses local date (not UTC) to match user's perception of "today" and "yesterday"
  const incrementStreak = useCallback(() => {
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const lastStudyDate = typeof window !== 'undefined' ? localStorage.getItem('lastStudyDate') : null;

    if (lastStudyDate !== today) {
      // Check if it's consecutive days
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;

      if (lastStudyDate === yesterdayStr) {
        // Consecutive day - increment streak
        setStreak((prev: number) => prev + 1);
      } else {
        // Not consecutive - reset streak to 1
        setStreak(1);
      }

      if (typeof window !== 'undefined') {
        localStorage.setItem('lastStudyDate', today);
      }
    }
    // If already studied today, don't change streak
  }, []);

  const resetStreak = useCallback(() => {
    setStreak(0);
  }, []);

  const completeQuest = useCallback((questId: string) => {
    setQuests((prev: Quest[]) => prev.map((quest: Quest) =>
      quest.id === questId && !quest.completed
        ? { ...quest, completed: true, completedAt: new Date(), progress: quest.target }
        : quest
    ));

    // Award points for completing quest
    const quest = quests.find((q: Quest) => q.id === questId);
    if (quest) {
      addPoints(quest.reward);
    }
  }, [quests, addPoints]);

  const completeChallenge = useCallback((challengeId: string) => {
    setChallenges((prev: Challenge[]) => prev.map((challenge: Challenge) =>
      challenge.id === challengeId && !challenge.completed
        ? { ...challenge, completed: true, completedAt: new Date() }
        : challenge
    ));

    // Award points for completing challenge
    // Find the challenge in the previous state to get its reward value
    const challengeReward = challenges.find((c: Challenge) => c.id === challengeId)?.reward || 0;
    if (challengeReward > 0) {
      addPoints(challengeReward);
    }
  }, [challenges, addPoints]);

  const updateDailyProgress = useCallback((amount: number) => {
    setDailyProgress((prev: number) => {
      const newProgress = prev + amount;
      return newProgress > dailyGoal ? dailyGoal : newProgress;
    });
  }, [dailyGoal]);

  const unlockAchievement = useCallback((achievementId: string) => {
    setAchievements((prev: Achievement[]) => prev.map((achievement: Achievement) =>
      achievement.id === achievementId && !achievement.earned
        ? { ...achievement, earned: true, earnedAt: new Date() }
        : achievement
    ));

    // Award points for unlocking achievement
    const achievement = achievements.find((a: Achievement) => a.id === achievementId);
    if (achievement) {
      addPoints(achievement.points);
    }
  }, [achievements, addPoints]);

  const addStudyTime = useCallback((minutes: number) => {
    setTotalStudyTime((prev: number) => prev + minutes);
    updateDailyProgress(minutes);

    // Check for study time achievements
    if (totalStudyTime + minutes >= 120) {
      unlockAchievement('marathon-study');
    }
  }, [totalStudyTime, updateDailyProgress, unlockAchievement]);

  // Coins system - tracks answer reveals in quiz
  const useCoin = useCallback(() => {
    if (coins >= 3) {
      return false; // If coins==3 then we can't do any other answer reveals
    }
    setCoins((prev: number) => prev + 1);
    return true;
  }, [coins]);

  const resetCoins = useCallback(() => {
    setCoins(0); // Reset coins for new quiz
  }, []);

  const checkQuestProgress = useCallback((questId: string, progress: number) => {
    setQuests((prev: Quest[]) => prev.map((quest: Quest) => {
      if (quest.id === questId && !quest.completed) {
        const newProgress = Math.min(quest.progress + progress, quest.target);
        const completed = newProgress >= quest.target;

        if (completed) {
          completeQuest(questId);
        }

        return { ...quest, progress: newProgress, completed };
      }
      return quest;
    }));
  }, [completeQuest]);

  const value = {
    points,
    level,
    streak,
    coins,
    badges,
    powerUps,
    quests,
    challenges,
    achievements,
    dailyGoal,
    dailyProgress,
    totalStudyTime,
    addPoints,
    addStudySessionPoints,
    addQuizPoints,

    buyPowerUp,
    incrementStreak,
    resetStreak,
    earnBadge,
    activatePowerUp,
    completeQuest,
    completeChallenge,
    updateDailyProgress,
    checkQuestProgress,
    addStudyTime,
    unlockAchievement,
    calculateLevelFromPoints,
    calculatePointsForNextLevel,
    useCoin,
    resetCoins,
    syncToDatabase,
    fetchLatestProgress,
  };

  return (
    <GamificationContext.Provider value={value}>
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