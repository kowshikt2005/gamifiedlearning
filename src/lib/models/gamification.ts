import { z } from 'zod';

// Client-safe ObjectId type (string representation)
export type ObjectIdString = string;

// Production-ready Zod schemas for validation
export const BadgeSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  icon: z.string(),
  earned: z.boolean(),
  earnedAt: z.date().optional(),
  rarity: z.enum(['common', 'rare', 'epic', 'legendary']).optional(),
  criteria: z.object({
    type: z.enum(['points', 'streak', 'sessions', 'quizzes', 'time', 'perfect_score']),
    value: z.number(),
    description: z.string()
  })
});

export const QuestSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  icon: z.string(),
  progress: z.number().min(0),
  target: z.number().min(1),
  reward: z.number().min(0),
  completed: z.boolean(),
  completedAt: z.date().optional(),
  category: z.enum(['study', 'quiz', 'ai', 'consistency', 'social']),
  triggerEvent: z.enum(['study_session_end', 'quiz_completed', 'ai_chat_message', 'daily_goal_met', 'streak_milestone'])
});

export const PowerUpSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  icon: z.string(),
  cost: z.number().min(1),
  duration: z.number().min(0), // 0 for instant effects
  multiplier: z.number().optional(),
  effect: z.enum(['double_points', 'time_extension', 'hint_revealer', 'focus_mode'])
});

export const ActivePowerUpSchema = z.object({
  powerUpId: z.string(),
  activatedAt: z.date(),
  expiresAt: z.date(),
  effect: z.enum(['double_points', 'time_extension', 'hint_revealer', 'focus_mode'])
});

export const AchievementSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  icon: z.string(),
  earned: z.boolean(),
  earnedAt: z.date().optional(),
  points: z.number().min(0),
  category: z.enum(['milestone', 'consistency', 'performance', 'social'])
});

export const StreakDataSchema = z.object({
  currentStreak: z.number().min(0),
  longestStreak: z.number().min(0),
  lastStudyDate: z.date().optional(),
  streakDates: z.array(z.string()) // ISO date strings for calendar
});

export const StudySessionSchema = z.object({
  id: z.string(),
  taskName: z.string(),
  duration: z.number().min(0), // in minutes
  pointsEarned: z.number(),
  quizScore: z.number().min(0).max(100).optional(),
  completedAt: z.date(),
  powerUpsUsed: z.array(z.string()),
  aiQuestionsAsked: z.number().min(0).default(0)
});

export const ChallengeSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  icon: z.string(),
  reward: z.number().min(0),
  completed: z.boolean(),
  completedAt: z.date().optional(),
  difficulty: z.enum(['easy', 'medium', 'hard']),
  criteria: z.object({
    type: z.enum(['speed_quiz', 'perfect_day', 'ai_master', 'early_riser']),
    target: z.number(),
    timeLimit: z.number().optional() // in seconds
  }),
  active: z.boolean().default(false),
  startedAt: z.date().optional()
});

// Main UserStats schema for database
export const UserStatsSchema = z.object({
  _id: z.string().optional(),
  userId: z.string(),
  
  // Core progression
  level: z.number().min(1),
  points: z.number().min(0),
  totalStudyTime: z.number().min(0), // in minutes
  
  // Streak system
  streak: StreakDataSchema,
  
  // Daily system
  dailyGoal: z.number().min(1), // in minutes
  dailyProgress: z.number().min(0), // in minutes
  lastDailyReset: z.date(),
  
  // Gamification elements
  badges: z.array(BadgeSchema),
  quests: z.array(QuestSchema),
  achievements: z.array(AchievementSchema),
  challenges: z.array(ChallengeSchema),
  
  // Power-ups and coins
  activePowerUps: z.array(ActivePowerUpSchema),
  coins: z.number().min(0).max(3), // Answer reveal system
  
  // Session tracking
  studySessions: z.array(StudySessionSchema),
  
  // Analytics data
  weeklyStudyTime: z.array(z.number()).length(7), // Last 7 days
  monthlyPoints: z.array(z.number()).length(30), // Last 30 days
  
  // Metadata
  createdAt: z.date(),
  updatedAt: z.date()
});

// TypeScript types derived from schemas
export type Badge = z.infer<typeof BadgeSchema>;
export type Quest = z.infer<typeof QuestSchema>;
export type PowerUp = z.infer<typeof PowerUpSchema>;
export type ActivePowerUp = z.infer<typeof ActivePowerUpSchema>;
export type Achievement = z.infer<typeof AchievementSchema>;
export type StreakData = z.infer<typeof StreakDataSchema>;
export type StudySession = z.infer<typeof StudySessionSchema>;
export type Challenge = z.infer<typeof ChallengeSchema>;
export type UserStats = z.infer<typeof UserStatsSchema>;

// Default data for new users
export const DEFAULT_BADGES: Badge[] = [
  {
    id: 'first-quiz',
    name: 'First Quiz',
    description: 'Complete your first quiz',
    icon: '🎓',
    earned: false,
    rarity: 'common',
    criteria: { type: 'quizzes', value: 1, description: 'Complete 1 quiz' }
  },
  {
    id: 'streak-7',
    name: 'Week Warrior',
    description: 'Study for 7 days in a row',
    icon: '🔥',
    earned: false,
    rarity: 'rare',
    criteria: { type: 'streak', value: 7, description: 'Maintain 7-day streak' }
  },
  {
    id: 'points-100',
    name: 'Centurion',
    description: 'Earn 100 points',
    icon: '💯',
    earned: false,
    rarity: 'common',
    criteria: { type: 'points', value: 100, description: 'Earn 100 total points' }
  },
  {
    id: 'perfect-score',
    name: 'Perfect Score',
    description: 'Get 100% on a quiz',
    icon: '🏆',
    earned: false,
    rarity: 'rare',
    criteria: { type: 'perfect_score', value: 1, description: 'Score 100% on any quiz' }
  },
  {
    id: 'scholar',
    name: 'Scholar',
    description: 'Complete 10 quizzes',
    icon: '📚',
    earned: false,
    rarity: 'epic',
    criteria: { type: 'quizzes', value: 10, description: 'Complete 10 quizzes' }
  },
  {
    id: 'time-master',
    name: 'Time Master',
    description: 'Study for 10 hours total',
    icon: '⏰',
    earned: false,
    rarity: 'epic',
    criteria: { type: 'time', value: 600, description: 'Study for 600 minutes total' }
  }
];

export const DEFAULT_QUESTS: Quest[] = [
  {
    id: 'study-60',
    name: 'Hour Master',
    description: 'Study for 60 minutes total',
    icon: '⏱️',
    progress: 0,
    target: 60,
    reward: 50,
    completed: false,
    category: 'study',
    triggerEvent: 'study_session_end'
  },
  {
    id: 'quiz-5',
    name: 'Quiz Champion',
    description: 'Complete 5 quizzes',
    icon: '📝',
    progress: 0,
    target: 5,
    reward: 75,
    completed: false,
    category: 'quiz',
    triggerEvent: 'quiz_completed'
  },
  {
    id: 'ai-chat-10',
    name: 'Chat Companion',
    description: 'Ask 10 questions to AI tutor',
    icon: '💬',
    progress: 0,
    target: 10,
    reward: 40,
    completed: false,
    category: 'ai',
    triggerEvent: 'ai_chat_message'
  },
  {
    id: 'daily-goal-7',
    name: 'Consistent Learner',
    description: 'Meet daily goal for 7 days',
    icon: '🎯',
    progress: 0,
    target: 7,
    reward: 100,
    completed: false,
    category: 'consistency',
    triggerEvent: 'daily_goal_met'
  }
];

export const DEFAULT_ACHIEVEMENTS: Achievement[] = [
  {
    id: 'first-session',
    name: 'First Steps',
    description: 'Complete your first study session',
    icon: '🎯',
    earned: false,
    points: 25,
    category: 'milestone'
  },
  {
    id: 'marathon-study',
    name: 'Marathon Runner',
    description: 'Study for 2 hours in one session',
    icon: '🏃',
    earned: false,
    points: 50,
    category: 'performance'
  },
  {
    id: 'consistent-week',
    name: 'Consistency King',
    description: 'Study every day for a week',
    icon: '📅',
    earned: false,
    points: 75,
    category: 'consistency'
  },
  {
    id: 'quiz-expert',
    name: 'Quiz Master',
    description: 'Score 90% or higher on 5 quizzes',
    icon: '🧠',
    earned: false,
    points: 100,
    category: 'performance'
  }
];

export const DEFAULT_CHALLENGES: Challenge[] = [
  {
    id: 'speed-quiz',
    name: 'Speed Demon',
    description: 'Complete a quiz in under 3 minutes',
    icon: '⚡',
    reward: 30,
    completed: false,
    difficulty: 'medium',
    criteria: { type: 'speed_quiz', target: 180 }, // 3 minutes in seconds
    active: false
  },
  {
    id: 'perfect-day',
    name: 'Perfect Day',
    description: 'Meet your daily goal without missing any questions',
    icon: '⭐',
    reward: 50,
    completed: false,
    difficulty: 'hard',
    criteria: { type: 'perfect_day', target: 1 },
    active: false
  }
];

export const AVAILABLE_POWER_UPS: PowerUp[] = [
  {
    id: 'double-points',
    name: 'Double Points',
    description: 'Earn 2x points for 30 minutes',
    icon: '✨',
    cost: 100,
    duration: 1800, // 30 minutes
    multiplier: 2,
    effect: 'double_points'
  },
  {
    id: 'time-extension',
    name: 'Time Boost',
    description: 'Add 15 minutes to your study session',
    icon: '⏰',
    cost: 75,
    duration: 0, // Instant effect
    effect: 'time_extension'
  },
  {
    id: 'hint-revealer',
    name: 'Hint Master',
    description: 'Reveal correct answers without penalty for 30 minutes',
    icon: '💡',
    cost: 150,
    duration: 1800,
    effect: 'hint_revealer'
  }
];

// Level calculation utilities
export function calculateLevelFromPoints(points: number): number {
  if (points < 100) return 1;
  
  let level = 1;
  let pointsUsed = 0;
  
  while (pointsUsed < points) {
    const pointsForNextLevel = 100 + (level - 1) * 50;
    if (pointsUsed + pointsForNextLevel <= points) {
      pointsUsed += pointsForNextLevel;
      level++;
    } else {
      break;
    }
  }
  
  return level;
}

export function calculatePointsForNextLevel(currentLevel: number, currentPoints: number): number {
  let pointsUsed = 0;
  
  // Calculate points used for all previous levels
  for (let level = 1; level < currentLevel; level++) {
    pointsUsed += 100 + (level - 1) * 50;
  }
  
  // Points needed for next level
  const pointsForNextLevel = 100 + (currentLevel - 1) * 50;
  const pointsInCurrentLevel = currentPoints - pointsUsed;
  
  return pointsForNextLevel - pointsInCurrentLevel;
}

// Points calculation utilities
export function calculateStudySessionPoints(
  minutes: number,
  completedSuccessfully: boolean,
  quizScore?: number,
  hasDoublePoints: boolean = false
): number {
  if (!completedSuccessfully) {
    return -25; // Penalty for early exit
  }
  
  let points = minutes * 5; // Base: 5 points per minute
  
  // Quiz performance bonus
  if (quizScore !== undefined) {
    if (quizScore >= 90) points += 25; // Excellent performance
    else if (quizScore >= 80) points += 15; // Good performance
    else if (quizScore >= 70) points += 10; // Decent performance
  }
  
  // Long session bonus
  if (minutes >= 60) {
    const bonusHours = Math.floor((minutes - 60) / 30);
    points += bonusHours * 10; // +10 per additional 30 minutes
  }
  
  // Apply double points power-up
  if (hasDoublePoints) {
    points *= 2;
  }
  
  return Math.max(0, points);
}

export function calculateQuizPoints(
  correctAnswers: number,
  wrongAnswers: number,
  answersRevealed: number,
  totalQuestions: number,
  timeSpent?: number,
  hasDoublePoints: boolean = false
): number {
  let points = 0;
  
  // Base scoring
  points += correctAnswers * 5; // +5 per correct
  points -= wrongAnswers * 1; // -1 per wrong
  points -= answersRevealed * 10; // -10 per reveal
  
  // Perfect score bonus
  if (correctAnswers === totalQuestions && totalQuestions > 0) {
    points += 50;
  }
  
  // Speed bonus (if completed in under 30 seconds per question)
  if (timeSpent && totalQuestions > 0) {
    const averageTimePerQuestion = timeSpent / totalQuestions;
    if (averageTimePerQuestion < 30) {
      points += totalQuestions * 2; // +2 per question for speed
    }
  }
  
  // Apply double points power-up
  if (hasDoublePoints) {
    points *= 2;
  }
  
  return Math.max(0, points);
}