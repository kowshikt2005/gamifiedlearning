/**
 * Atlas User Service
 * 
 * This service works with the new MongoDB Atlas schema
 * and provides compatibility with the existing application.
 */

import { getDatabase } from '@/lib/mongodb';
import { resilientDb } from '@/lib/db-resilience';
import { User as LegacyUser, UserProgress, StudySession, defaultUserProgress } from '@/lib/models/user';
import bcrypt from 'bcryptjs';
import { ObjectId, Int32 } from 'mongodb';

// Atlas User interface (matches our new schema)
interface AtlasUser {
  _id?: ObjectId;
  username: string;
  email: string;
  password: string;
  totalPoints: number;
  createdAt: Date;
  updatedAt: Date;
}

export class AtlasUserService {
  private static async getUsersCollection() {
    const db = await resilientDb.getDatabase();
    return db.collection<AtlasUser>('users');
  }

  static async createUser(username: string, email: string, password: string): Promise<LegacyUser> {
    const users = await this.getUsersCollection();
    
    // Check if user already exists
    const existingUser = await users.findOne({ 
      $or: [{ email }, { username }] 
    });
    
    if (existingUser) {
      throw new Error('User with this email or username already exists');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    const newAtlasUser: AtlasUser = {
      username,
      email,
      password: hashedPassword,
      totalPoints: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const result = await users.insertOne(newAtlasUser);
    const userId = result.insertedId;
    
    // Initialize user stats for the new user
    await this.initializeUserStats(userId);
    
    // Convert to legacy format for compatibility
    return await this.convertAtlasToLegacy({ ...newAtlasUser, _id: userId });
  }

  /**
   * Initialize user stats for a new user
   */
  private static async initializeUserStats(userId: ObjectId): Promise<void> {
    const db = await getDatabase();
    const userStats = db.collection('userstats');
    
    const defaultStats = {
      userId,
      level: 1,
      points: 0,
      streak: 0,
      quizAccuracy: 0,
      dailyGoal: 500, // 500 points per day
      totalStudyTime: 0,
      badges: defaultUserProgress.badges,
      achievements: defaultUserProgress.achievements,
      quests: defaultUserProgress.quests,
      challenges: [],
      powerUps: [],
      createdAt: new Date(),
      updatedAt: new Date()
    };

    await userStats.insertOne(defaultStats);
  }

  static async authenticateUser(email: string, password: string): Promise<LegacyUser | null> {
    const users = await this.getUsersCollection();
    const atlasUser = await users.findOne({ email });
    
    if (!atlasUser) {
      return null;
    }

    const isPasswordValid = await bcrypt.compare(password, atlasUser.password);
    if (!isPasswordValid) {
      return null;
    }

    // Convert to legacy format for compatibility
    return await this.convertAtlasToLegacy(atlasUser);
  }

  static async getUserById(userId: string): Promise<LegacyUser | null> {
    const users = await this.getUsersCollection();
    const atlasUser = await users.findOne({ _id: new ObjectId(userId) });
    
    if (!atlasUser) {
      return null;
    }

    return await this.convertAtlasToLegacy(atlasUser);
  }

  static async getUserByEmail(email: string): Promise<LegacyUser | null> {
    const users = await this.getUsersCollection();
    const atlasUser = await users.findOne({ email });
    
    if (!atlasUser) {
      return null;
    }

    return await this.convertAtlasToLegacy(atlasUser);
  }

  /**
   * Convert Atlas user format to legacy format for compatibility
   */
  private static async convertAtlasToLegacy(atlasUser: AtlasUser): Promise<LegacyUser> {
    // Get user stats from userstats collection
    const db = await getDatabase();
    const userStats = await db.collection('userstats').findOne({ userId: atlasUser._id });
    
    return {
      _id: atlasUser._id,
      username: atlasUser.username,
      email: atlasUser.email,
      password: atlasUser.password,
      createdAt: atlasUser.createdAt,
      updatedAt: atlasUser.updatedAt,
      progress: {
        level: userStats?.level || 1,
        points: userStats?.points || atlasUser.totalPoints || 0,
        streak: userStats?.streak || 0,
        lastStudyDate: userStats?.lastStudyDate,
        totalStudyTime: userStats?.totalStudyTime || 0,
        dailyGoal: userStats?.dailyGoal || 500,
        badges: userStats?.badges || defaultUserProgress.badges,
        quests: userStats?.quests || defaultUserProgress.quests,
        achievements: userStats?.achievements || defaultUserProgress.achievements,
        studySessions: [] // Will be loaded separately from tasks collection
      }
    };
  }

  /**
   * Update user progress (New schema format)
   */
  static async updateUserProgress(userId: string, updates: Partial<UserProgress>): Promise<void> {
    const db = await getDatabase();
    const users = db.collection('users');
    const userStats = db.collection('userstats');
    
    // Update totalPoints in users collection if points changed
    if (updates.points !== undefined) {
      await users.updateOne(
        { _id: new ObjectId(userId) },
        { 
          $set: { 
            totalPoints: updates.points,
            updatedAt: new Date()
          }
        }
      );
    }

    // Update detailed stats in userstats collection with proper data validation
    const statsUpdates: any = {
      updatedAt: new Date()
    };

    // Add required fields if not present
    statsUpdates.createdAt = new Date();

    // Validate and sanitize data types before database operations
    if (updates.level !== undefined && typeof updates.level === 'number') {
      statsUpdates.level = Math.floor(Math.max(1, updates.level));
    }
    if (updates.points !== undefined && typeof updates.points === 'number') {
      statsUpdates.points = Math.floor(Math.max(0, updates.points));
    }
    if (updates.streak !== undefined && typeof updates.streak === 'number') {
      statsUpdates.streak = Math.floor(Math.max(0, updates.streak));
    }
    if (updates.totalStudyTime !== undefined && typeof updates.totalStudyTime === 'number') {
      statsUpdates.totalStudyTime = Math.floor(Math.max(0, updates.totalStudyTime));
    }
    if (updates.lastStudyDate !== undefined) {
      // Ensure lastStudyDate is properly formatted as a Date object
      statsUpdates.lastStudyDate = new Date(updates.lastStudyDate);
    }
    if (updates.dailyGoal !== undefined && typeof updates.dailyGoal === 'number') {
      statsUpdates.dailyGoal = Math.floor(Math.max(0, updates.dailyGoal));
    }
    if (updates.badges !== undefined && Array.isArray(updates.badges)) {
      // Format badges according to schema
      statsUpdates.badges = updates.badges.map(badge => ({
        id: badge.id,
        name: badge.name,
        description: badge.description,
        icon: badge.icon,
        earned: !!badge.earned,
        ...(badge.earnedAt && { earnedAt: new Date(badge.earnedAt) }),
        ...(badge.rarity && { rarity: badge.rarity })
      }));
    }
    if (updates.quests !== undefined && Array.isArray(updates.quests)) {
      // Format quests according to schema
      statsUpdates.quests = updates.quests.map(quest => ({
        id: quest.id,
        name: quest.name,
        description: quest.description,
        icon: quest.icon,
        progress: Math.floor(quest.progress || 0),
        target: Math.floor(quest.target || 1),
        reward: Math.floor(quest.reward || 0),
        completed: !!quest.completed,
        ...(quest.completedAt && { completedAt: new Date(quest.completedAt) }),
        ...(quest.category && { category: quest.category })
      }));
    }
    if (updates.achievements !== undefined && Array.isArray(updates.achievements)) {
      // Format achievements according to schema
      statsUpdates.achievements = updates.achievements.map(achievement => ({
        id: achievement.id,
        name: achievement.name,
        description: achievement.description,
        icon: achievement.icon,
        earned: !!achievement.earned,
        ...(achievement.earnedAt && { earnedAt: new Date(achievement.earnedAt) }),
        points: Math.floor(achievement.points || 0)
      }));
    }

    try {
      await userStats.updateOne(
        { userId: new ObjectId(userId) },
        { $set: statsUpdates },
        { upsert: true }
      );


    } catch (error) {
      throw new Error(`Database validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Add study session (creates in tasks collection)
   */
  static async addStudySession(userId: string, session: StudySession): Promise<void> {
    const db = await getDatabase();
    const tasks = db.collection('tasks');
    const users = db.collection('users');
    const userStats = db.collection('userstats');
    
    // Create session in tasks collection
    // Use a more unique identifier to prevent duplicates
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const newTask = {
      userId: new ObjectId(userId),
      sessionId,
      title: session.taskName,
      status: 'completed',
      studyTime: new Int32(session.duration), // Ensure it's an integer
      pointsEarned: new Int32(session.points), // Ensure it's an integer
      createdAt: session.completedAt,
      updatedAt: new Date(),
      completedAt: session.completedAt
    };

    await tasks.insertOne(newTask);

    // Get current user stats
    const stats = await userStats.findOne({ userId: new ObjectId(userId) });
    const currentPoints = stats?.points || 0;
    // const currentLevel = stats?.level || 1; // Unused for now
    const currentStudyTime = stats?.totalStudyTime || 0;
    const currentStreak = stats?.streak || 0;
    
    const newPoints = currentPoints + session.points;
    const newStudyTime = currentStudyTime + session.duration;
    const newLevel = Math.floor(newPoints / 100) + 1;
    
    // Update streak logic
    const today = new Date();
    const lastStudyDate = stats?.lastStudyDate;
    let newStreak = currentStreak;
    
    if (lastStudyDate) {
      const daysDiff = Math.floor((today.getTime() - lastStudyDate.getTime()) / (1000 * 60 * 60 * 24));
      if (daysDiff === 1) {
        newStreak += 1;
      } else if (daysDiff > 1) {
        newStreak = 1;
      }
    } else {
      newStreak = 1;
    }

    // Update user stats
    await userStats.updateOne(
      { userId: new ObjectId(userId) },
      {
        $set: {
          points: newPoints,
          level: newLevel,
          totalStudyTime: newStudyTime,
          streak: newStreak,
          lastStudyDate: today,
          updatedAt: new Date()
        }
      },
      { upsert: true }
    );

    // Update user total points
    await users.updateOne(
      { _id: new ObjectId(userId) },
      {
        $set: {
          totalPoints: newPoints,
          updatedAt: new Date()
        }
      }
    );
  }

  /**
   * Get study sessions with time data (from tasks collection) - OPTIMIZED
   */
  static async getStudySessionsWithTimeData(userId: string): Promise<Array<{
    date: string;
    duration: number;
    score: number;
    points: number;
  }>> {
    const db = await getDatabase();
    const tasks = db.collection('tasks');
    
    // Use aggregation pipeline for better performance - single query instead of N+1
    const pipeline = [
      {
        $match: { 
          userId: new ObjectId(userId), 
          status: 'completed' 
        }
      },
      {
        $lookup: {
          from: 'quiz',
          localField: 'sessionId',
          foreignField: 'sessionId',
          as: 'quizData'
        }
      },
      {
        $project: {
          date: {
            $dateToString: {
              format: '%Y-%m-%d',
              date: '$createdAt'
            }
          },
          duration: {
            $cond: {
              if: { $type: '$studyTime' },
              then: '$studyTime',
              else: 0
            }
          },
          score: {
            $cond: {
              if: { $gt: [{ $size: '$quizData' }, 0] },
              then: { $arrayElemAt: ['$quizData.score', 0] },
              else: 0
            }
          },
          points: {
            $cond: {
              if: { $type: '$pointsEarned' },
              then: '$pointsEarned',
              else: 0
            }
          }
        }
      },
      {
        $sort: { date: -1 }
      },
      {
        $limit: 100 // Limit to recent 100 sessions for performance
      }
    ];

    const sessions = await tasks.aggregate(pipeline).toArray();
    
    return sessions.map(session => ({
      date: session.date,
      duration: Number(session.duration) || 0,
      score: Number(session.score) || 0,
      points: Number(session.points) || 0
    }));
  }

  // Placeholder methods for badge/quest/achievement management
  // These would integrate with the separate collections in a full implementation
  static async updateBadge(_userId: string, _badgeId: string, _earned: boolean): Promise<void> {
    // TODO: Implement with userBadges collection
    // Placeholder implementation
  }

  static async updateQuest(_userId: string, _questId: string, _progress: number): Promise<void> {
    // TODO: Implement with quests collection
    // Placeholder implementation
  }

  static async updateAchievement(_userId: string, _achievementId: string, _earned: boolean): Promise<void> {
    // TODO: Implement with achievements collection
    // Placeholder implementation
  }
}