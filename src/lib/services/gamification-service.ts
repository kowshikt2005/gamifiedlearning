import { ObjectId } from 'mongodb';
import { getDatabase } from '@/lib/mongodb';
import { 
  UserStats, 
  Badge,
  Quest,
  Achievement,
  StudySession,
  ActivePowerUp,
  StreakData,
  DEFAULT_BADGES,
  DEFAULT_QUESTS,
  DEFAULT_ACHIEVEMENTS,
  DEFAULT_CHALLENGES,
  AVAILABLE_POWER_UPS,
  calculateLevelFromPoints,
  calculateStudySessionPoints,
  calculateQuizPoints
} from '@/lib/models/gamification';
import { 
  ServerUserStats,
  ServerUserStatsSchema,
  toClientUserStats,
  // toServerUserStats // Reserved for future server-side transformations
} from '@/lib/models/gamification-server';
import { performanceMonitor } from '@/lib/performance-monitor';

export class GamificationService {
  private static readonly COLLECTION_NAME = 'userStats';
  private static processedSessions = new Set<string>();
  
  /**
   * Clear processed sessions cache (for debugging/reset purposes)
   */
  static clearProcessedSessions(): void {
    this.processedSessions.clear();
    console.log('🧹 Cleared processed sessions cache');
  }
  
  /**
   * Initialize user stats for a new user
   */
  static async initializeUserStats(userId: string): Promise<UserStats> {
    const endTimer = performanceMonitor.startTimer('gamification_init_user');
    
    try {
      const db = await getDatabase();
      const userObjectId = new ObjectId(userId);
      
      const defaultServerStats: ServerUserStats = {
        userId: userObjectId,
        level: 1,
        points: 0,
        totalStudyTime: 0,
        streak: {
          currentStreak: 0,
          longestStreak: 0,
          streakDates: []
        },
        dailyGoal: 30, // 30 minutes default
        dailyProgress: 0,
        lastDailyReset: new Date(),
        badges: DEFAULT_BADGES,
        quests: DEFAULT_QUESTS,
        achievements: DEFAULT_ACHIEVEMENTS,
        challenges: DEFAULT_CHALLENGES,
        activePowerUps: [],
        coins: 0,
        studySessions: [],
        weeklyStudyTime: [0, 0, 0, 0, 0, 0, 0],
        monthlyPoints: Array(30).fill(0),
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      // Validate with server schema
      const validatedStats = ServerUserStatsSchema.parse(defaultServerStats);
      
      await db.collection(this.COLLECTION_NAME).insertOne(validatedStats);
      
      // Return client-safe version
      return toClientUserStats(validatedStats);
    } catch (error) {
      console.error('Failed to initialize user stats:', error);
      throw new Error('Unable to initialize user progress');
    } finally {
      endTimer();
    }
  }
  
  /**
   * Get user stats by user ID
   */
  static async getUserStats(userId: string): Promise<UserStats | null> {
    const endTimer = performanceMonitor.startTimer('gamification_get_stats');
    
    try {
      const db = await getDatabase();
      const userObjectId = new ObjectId(userId);
      
      const stats = await db.collection(this.COLLECTION_NAME).findOne({
        userId: userObjectId
      });
      
      if (!stats) {
        // Initialize stats for new user
        return await this.initializeUserStats(userId);
      }
      
      // Validate with server schema and convert to client format
      const serverStats = ServerUserStatsSchema.parse(stats);
      return toClientUserStats(serverStats);
    } catch (error) {
      console.error('Failed to get user stats:', error);
      return null;
    } finally {
      endTimer();
    }
  }
  
  /**
   * Update user stats with validation
   */
  static async updateUserStats(userId: string, updates: Partial<UserStats>): Promise<boolean> {
    const endTimer = performanceMonitor.startTimer('gamification_update_stats');
    
    try {
      const db = await getDatabase();
      const userObjectId = new ObjectId(userId);
      
      // Add updatedAt timestamp
      const updateData = {
        ...updates,
        updatedAt: new Date()
      };
      
      const result = await db.collection(this.COLLECTION_NAME).updateOne(
        { userId: userObjectId },
        { $set: updateData }
      );
      
      return result.modifiedCount > 0;
    } catch (error) {
      console.error('Failed to update user stats:', error);
      return false;
    } finally {
      endTimer();
    }
  }
  
  /**
   * Process study session completion
   */
  static async processStudySession(
    userId: string,
    sessionData: {
      taskName: string;
      duration: number;
      completedSuccessfully: boolean;
      quizScore?: number;
      aiQuestionsAsked?: number;
    }
  ): Promise<{ pointsEarned: number; levelUp: boolean; newAchievements: Achievement[] }> {
    const endTimer = performanceMonitor.startTimer('gamification_process_session');
    
    try {
      const stats = await this.getUserStats(userId);
      if (!stats) throw new Error('User stats not found');
      
      // Check for active double points power-up
      const hasDoublePoints = stats.activePowerUps.some(
        powerUp => powerUp.effect === 'double_points' && powerUp.expiresAt > new Date()
      );
      
      // Calculate points
      const pointsEarned = calculateStudySessionPoints(
        sessionData.duration,
        sessionData.completedSuccessfully,
        sessionData.quizScore,
        hasDoublePoints
      );
      
      // Create study session record
      const studySession: StudySession = {
        id: new ObjectId().toString(),
        taskName: sessionData.taskName,
        duration: sessionData.duration,
        pointsEarned,
        quizScore: sessionData.quizScore,
        completedAt: new Date(),
        powerUpsUsed: stats.activePowerUps.map(p => p.powerUpId),
        aiQuestionsAsked: sessionData.aiQuestionsAsked || 0
      };
      
      // Update stats
      const newPoints = stats.points + pointsEarned;
      const newLevel = calculateLevelFromPoints(newPoints);
      const levelUp = newLevel > stats.level;
      
      // Update streak
      const updatedStreak = this.updateStreak(stats.streak);
      
      // Update daily progress
      const newDailyProgress = sessionData.completedSuccessfully 
        ? stats.dailyProgress + sessionData.duration 
        : stats.dailyProgress;
      
      // Update weekly/monthly analytics
      const updatedWeeklyTime = this.updateWeeklyStudyTime(stats.weeklyStudyTime, sessionData.duration);
      const updatedMonthlyPoints = this.updateMonthlyPoints(stats.monthlyPoints, pointsEarned);
      
      // Process quests
      const updatedQuests = this.processQuestProgress(stats.quests, 'study_session_end', {
        duration: sessionData.duration,
        aiQuestions: sessionData.aiQuestionsAsked || 0
      });
      
      // Check for new achievements and badges
      const newAchievements = this.checkAchievements(stats, {
        newPoints,
        newLevel,
        sessionDuration: sessionData.duration,
        quizScore: sessionData.quizScore,
        streak: updatedStreak.currentStreak
      });
      
      const updatedBadges = this.checkBadges(stats.badges, {
        points: newPoints,
        level: newLevel,
        streak: updatedStreak.currentStreak,
        totalSessions: stats.studySessions.length + 1,
        quizScore: sessionData.quizScore
      });
      
      // Update database
      await this.updateUserStats(userId, {
        points: newPoints,
        level: newLevel,
        totalStudyTime: stats.totalStudyTime + sessionData.duration,
        streak: updatedStreak,
        dailyProgress: newDailyProgress,
        badges: updatedBadges,
        quests: updatedQuests,
        achievements: [...stats.achievements, ...newAchievements],
        studySessions: [...stats.studySessions, studySession],
        weeklyStudyTime: updatedWeeklyTime,
        monthlyPoints: updatedMonthlyPoints
      });
      
      return {
        pointsEarned,
        levelUp,
        newAchievements
      };
    } catch (error) {
      console.error('Failed to process study session:', error);
      throw new Error('Unable to process study session');
    } finally {
      endTimer();
    }
  }
  
  /**
   * Process quiz completion with duplicate prevention
   */
  static async processQuizCompletion(
    userId: string,
    quizData: {
      correctAnswers: number;
      wrongAnswers: number;
      answersRevealed: number;
      totalQuestions: number;
      timeSpent?: number;
      sessionId?: string;
    }
  ): Promise<{ pointsEarned: number; newAchievements: Achievement[] }> {
    const endTimer = performanceMonitor.startTimer('gamification_process_quiz');
    
    try {
      // Prevent duplicate processing
      const sessionKey = `${userId}_${quizData.sessionId || Date.now()}`;
      if (this.processedSessions.has(sessionKey)) {
        console.warn('Quiz session already processed, skipping:', sessionKey);
        return { pointsEarned: 0, newAchievements: [] };
      }
      this.processedSessions.add(sessionKey);
      
      const stats = await this.getUserStats(userId);
      if (!stats) throw new Error('User stats not found');
      
      // Check for active double points power-up
      const hasDoublePoints = stats.activePowerUps.some(
        powerUp => powerUp.effect === 'double_points' && powerUp.expiresAt > new Date()
      );
      
      // Calculate points
      const pointsEarned = calculateQuizPoints(
        quizData.correctAnswers,
        quizData.wrongAnswers,
        quizData.answersRevealed,
        quizData.totalQuestions,
        quizData.timeSpent,
        hasDoublePoints
      );
      
      console.log('🧮 Quiz points calculation:', {
        input: quizData,
        hasDoublePoints,
        pointsEarned,
        breakdown: {
          correct: quizData.correctAnswers * 5,
          wrong: quizData.wrongAnswers * -1,
          reveals: quizData.answersRevealed * -10,
          perfectBonus: (quizData.correctAnswers === quizData.totalQuestions && quizData.totalQuestions > 0) ? 50 : 0
        }
      });
      
      const newPoints = stats.points + pointsEarned;
      const newLevel = calculateLevelFromPoints(newPoints);
      const quizScore = (quizData.correctAnswers / quizData.totalQuestions) * 100;
      
      // Process quests
      const updatedQuests = this.processQuestProgress(stats.quests, 'quiz_completed', {
        quizScore,
        perfectScore: quizScore === 100
      });
      
      // Check achievements
      const newAchievements = this.checkAchievements(stats, {
        newPoints,
        newLevel,
        quizScore,
        perfectScore: quizScore === 100
      });
      
      // Update badges
      const updatedBadges = this.checkBadges(stats.badges, {
        points: newPoints,
        level: newLevel,
        quizScore,
        perfectScore: quizScore === 100
      });
      
      // Update database
      await this.updateUserStats(userId, {
        points: newPoints,
        level: newLevel,
        badges: updatedBadges,
        quests: updatedQuests,
        achievements: [...stats.achievements, ...newAchievements],
        monthlyPoints: this.updateMonthlyPoints(stats.monthlyPoints, pointsEarned)
      });
      
      return {
        pointsEarned,
        newAchievements
      };
    } catch (error) {
      console.error('Failed to process quiz completion:', error);
      throw new Error('Unable to process quiz completion');
    } finally {
      endTimer();
    }
  }
  
  /**
   * Purchase and activate power-up
   */
  static async purchasePowerUp(userId: string, powerUpId: string): Promise<boolean> {
    const endTimer = performanceMonitor.startTimer('gamification_purchase_powerup');
    
    try {
      const stats = await this.getUserStats(userId);
      if (!stats) return false;
      
      const powerUp = AVAILABLE_POWER_UPS.find(p => p.id === powerUpId);
      if (!powerUp) return false;
      
      // Check if user has enough points
      if (stats.points < powerUp.cost) return false;
      
      // Check if power-up is already active
      const isActive = stats.activePowerUps.some(
        ap => ap.powerUpId === powerUpId && ap.expiresAt > new Date()
      );
      if (isActive) return false;
      
      // Create active power-up
      const activePowerUp: ActivePowerUp = {
        powerUpId,
        activatedAt: new Date(),
        expiresAt: new Date(Date.now() + powerUp.duration * 1000),
        effect: powerUp.effect
      };
      
      // Update stats
      await this.updateUserStats(userId, {
        points: stats.points - powerUp.cost,
        activePowerUps: [...stats.activePowerUps, activePowerUp]
      });
      
      return true;
    } catch (error) {
      console.error('Failed to purchase power-up:', error);
      return false;
    } finally {
      endTimer();
    }
  }
  
  /**
   * Consume a coin for answer reveal
   */
  static async consumeCoin(userId: string): Promise<boolean> {
    const endTimer = performanceMonitor.startTimer('gamification_use_coin');
    
    try {
      const stats = await this.getUserStats(userId);
      if (!stats || stats.coins >= 3) return false;
      
      await this.updateUserStats(userId, {
        coins: stats.coins + 1
      });
      
      return true;
    } catch (error) {
      console.error('Failed to use coin:', error);
      return false;
    } finally {
      endTimer();
    }
  }
  
  /**
   * Reset daily progress and coins
   */
  static async resetDailyProgress(userId: string): Promise<void> {
    const endTimer = performanceMonitor.startTimer('gamification_reset_daily');
    
    try {
      await this.updateUserStats(userId, {
        dailyProgress: 0,
        coins: 0,
        lastDailyReset: new Date()
      });
    } catch (error) {
      console.error('Failed to reset daily progress:', error);
    } finally {
      endTimer();
    }
  }
  
  /**
   * Get recent achievements (last 5)
   */
  static async getRecentAchievements(userId: string): Promise<Achievement[]> {
    const stats = await this.getUserStats(userId);
    if (!stats) return [];
    
    return stats.achievements
      .filter(a => a.earned && a.earnedAt)
      .sort((a, b) => (b.earnedAt?.getTime() || 0) - (a.earnedAt?.getTime() || 0))
      .slice(0, 5);
  }
  
  /**
   * Get active quests
   */
  static async getActiveQuests(userId: string): Promise<Quest[]> {
    const stats = await this.getUserStats(userId);
    if (!stats) return [];
    
    return stats.quests.filter(q => !q.completed);
  }
  
  // Private helper methods
  
  private static updateStreak(currentStreak: StreakData): StreakData {
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    // Check if already studied today
    if (currentStreak.streakDates.includes(today)) {
      return currentStreak;
    }
    
    // Check if studied yesterday (continue streak) or starting new streak
    const studiedYesterday = currentStreak.streakDates.includes(yesterday);
    
    const newStreak = studiedYesterday ? currentStreak.currentStreak + 1 : 1;
    const newLongestStreak = Math.max(newStreak, currentStreak.longestStreak);
    
    return {
      currentStreak: newStreak,
      longestStreak: newLongestStreak,
      lastStudyDate: new Date(),
      streakDates: [...currentStreak.streakDates, today].slice(-30) // Keep last 30 days
    };
  }
  
  private static updateWeeklyStudyTime(weeklyTime: number[], minutes: number): number[] {
    const dayOfWeek = new Date().getDay(); // 0 = Sunday
    const newWeekly = [...weeklyTime];
    newWeekly[dayOfWeek] += minutes;
    return newWeekly;
  }
  
  private static updateMonthlyPoints(monthlyPoints: number[], points: number): number[] {
    const dayOfMonth = new Date().getDate() - 1; // 0-based index
    const newMonthly = [...monthlyPoints];
    if (dayOfMonth < newMonthly.length) {
      newMonthly[dayOfMonth] += points;
    }
    return newMonthly;
  }
  
  private static processQuestProgress(
    quests: Quest[], 
    triggerEvent: Quest['triggerEvent'], 
    data: any
  ): Quest[] {
    return quests.map(quest => {
      if (quest.completed || quest.triggerEvent !== triggerEvent) {
        return quest;
      }
      
      let progressIncrement = 0;
      
      switch (quest.category) {
        case 'study':
          if (triggerEvent === 'study_session_end') {
            progressIncrement = data.duration || 0;
          }
          break;
        case 'quiz':
          if (triggerEvent === 'quiz_completed') {
            progressIncrement = 1;
          }
          break;
        case 'ai':
          if (triggerEvent === 'ai_chat_message') {
            progressIncrement = data.aiQuestions || 0;
          }
          break;
      }
      
      const newProgress = Math.min(quest.progress + progressIncrement, quest.target);
      const completed = newProgress >= quest.target;
      
      return {
        ...quest,
        progress: newProgress,
        completed,
        completedAt: completed ? new Date() : quest.completedAt
      };
    });
  }
  
  private static checkAchievements(stats: UserStats, data: any): Achievement[] {
    const newAchievements: Achievement[] = [];
    
    for (const achievement of stats.achievements) {
      if (achievement.earned) continue;
      
      let shouldEarn = false;
      
      switch (achievement.id) {
        case 'first-session':
          shouldEarn = stats.studySessions.length === 0; // First session
          break;
        case 'marathon-study':
          shouldEarn = data.sessionDuration >= 120; // 2 hours
          break;
        case 'consistent-week':
          shouldEarn = data.streak >= 7;
          break;
        case 'quiz-expert':
          // Check if user has 5 quizzes with 90%+ score
          const highScoreQuizzes = stats.studySessions.filter(s => 
            s.quizScore && s.quizScore >= 90
          ).length;
          shouldEarn = highScoreQuizzes >= 5;
          break;
      }
      
      if (shouldEarn) {
        newAchievements.push({
          ...achievement,
          earned: true,
          earnedAt: new Date()
        });
      }
    }
    
    return newAchievements;
  }
  
  private static checkBadges(badges: Badge[], data: any): Badge[] {
    return badges.map(badge => {
      if (badge.earned) return badge;
      
      let shouldEarn = false;
      
      switch (badge.criteria.type) {
        case 'points':
          shouldEarn = data.points >= badge.criteria.value;
          break;
        case 'streak':
          shouldEarn = data.streak >= badge.criteria.value;
          break;
        case 'sessions':
          shouldEarn = data.totalSessions >= badge.criteria.value;
          break;
        case 'perfect_score':
          shouldEarn = data.perfectScore === true;
          break;
      }
      
      if (shouldEarn) {
        return {
          ...badge,
          earned: true,
          earnedAt: new Date()
        };
      }
      
      return badge;
    });
  }
}
