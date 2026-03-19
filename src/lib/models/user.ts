import { ObjectId } from 'mongodb';

export interface StudySession {
  id: string;
  taskName: string;
  duration: number; // in minutes
  score: number;
  points: number;
  completedAt: Date;
  quizAnswers?: Array<{
    questionIndex: number;
    answer: string;
    correct: boolean;
  }>;
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  earned: boolean;
  earnedAt?: Date;
  rarity?: 'common' | 'rare' | 'epic' | 'legendary';
}

export interface Quest {
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
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  earned: boolean;
  earnedAt?: Date;
  points: number;
}

export interface UserProgress {
  level: number;
  points: number;
  streak: number;
  lastStudyDate?: Date;
  totalStudyTime: number; // in minutes
  dailyGoal: number; // in minutes
  badges: Badge[];
  quests: Quest[];
  achievements: Achievement[];
  studySessions: StudySession[];
}

export interface User {
  _id?: ObjectId;
  username: string;
  email: string;
  password: string;
  createdAt: Date;
  updatedAt: Date;
  progress: UserProgress;
}

export const defaultUserProgress: UserProgress = {
  level: 1,
  points: 0,
  streak: 0,
  totalStudyTime: 0,
  dailyGoal: 30,
  badges: [
    { id: 'first-quiz', name: 'Pop Quiz!', description: 'Took your first quiz', icon: '🎓', earned: false, rarity: 'common' },
    { id: 'streak-7', name: 'On a Roll', description: 'Kept a 7-day study streak', icon: '🔥', earned: false, rarity: 'rare' },
    { id: 'points-100', name: 'Centurion', description: 'Racked up 100 points', icon: '💯', earned: false, rarity: 'common' },
    { id: 'perfect-score', name: 'Flawless', description: 'Aced a quiz with 100%', icon: '🏆', earned: false, rarity: 'rare' },
    { id: 'early-bird', name: 'Early Bird', description: 'Hit the books before 8 AM', icon: '🐦', earned: false, rarity: 'common' },
    { id: 'night-owl', name: 'Night Owl', description: 'Burned the midnight oil past 10 PM', icon: '🦉', earned: false, rarity: 'common' },
    { id: 'speed-demon', name: 'Quick Draw', description: 'Blazed through a quiz in under 5 minutes', icon: '⚡', earned: false, rarity: 'epic' },
    { id: 'scholar', name: 'Bookworm', description: 'Knocked out 10 quizzes', icon: '📚', earned: false, rarity: 'epic' },
  ],
  quests: [
    { id: 'study-60', name: 'The Long Haul', description: 'Study for 60 minutes total', icon: '⏱️', progress: 0, target: 60, reward: 50, completed: false, category: 'study' },
    { id: 'quiz-5', name: 'Five for Five', description: 'Complete 5 quizzes', icon: '📝', progress: 0, target: 5, reward: 75, completed: false, category: 'quiz' },
    { id: 'ai-chat-10', name: 'Curious Mind', description: 'Ask 10 questions in chat', icon: '💬', progress: 0, target: 10, reward: 40, completed: false, category: 'chat' },
    { id: 'streak-30', name: 'No Days Off', description: 'Keep a 30-day study streak', icon: '📅', progress: 0, target: 30, reward: 150, completed: false, category: 'consistency' },
  ],
  achievements: [
    { id: 'first-session', name: 'Off the Bench', description: 'Completed your first study session', icon: '🎯', earned: false, points: 10 },
    { id: 'marathon-study', name: 'Deep Focus', description: 'Studied for 2 hours straight', icon: '🏃', earned: false, points: 50 },
    { id: 'consistent-week', name: 'Clockwork', description: 'Studied every day for a full week', icon: '📅', earned: false, points: 75 },
    { id: 'quiz-expert', name: 'Honor Roll', description: 'Scored 90%+ on 5 quizzes', icon: '📝', earned: false, points: 100 },
  ],
  studySessions: [],
};