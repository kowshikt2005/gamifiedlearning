/**
 * Server-only gamification models with MongoDB ObjectId support
 * This file should only be imported in server-side code (API routes, services)
 */

import { ObjectId } from 'mongodb';
import { z } from 'zod';
import { 
  BadgeSchema,
  QuestSchema,
  // PowerUpSchema, // Reserved for future power-up features
  ActivePowerUpSchema,
  AchievementSchema,
  StreakDataSchema,
  StudySessionSchema,
  ChallengeSchema,
  UserStatsSchema as ClientUserStatsSchema
} from './gamification';

// Server-side UserStats schema with actual ObjectId
export const ServerUserStatsSchema = z.object({
  _id: z.instanceof(ObjectId).optional(),
  userId: z.instanceof(ObjectId),
  
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

// Server-side type
export type ServerUserStats = z.infer<typeof ServerUserStatsSchema>;

// Utility functions for converting between client and server types
export function toClientUserStats(serverStats: ServerUserStats): z.infer<typeof ClientUserStatsSchema> {
  return {
    ...serverStats,
    _id: serverStats._id?.toString(),
    userId: serverStats.userId.toString()
  };
}

export function toServerUserStats(clientStats: z.infer<typeof ClientUserStatsSchema>, userId: ObjectId): ServerUserStats {
  return {
    ...clientStats,
    _id: clientStats._id ? new ObjectId(clientStats._id) : undefined,
    userId
  };
}