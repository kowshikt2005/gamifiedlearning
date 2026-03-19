import { NextRequest, NextResponse } from 'next/server';
import { AtlasUserService } from '@/lib/services/atlas-user-service';
import { StudySession } from '@/lib/models/user';
import { QuizAnswer } from '@/lib/database-utils';
import { getDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { getUserStringIdFromRequest } from '@/lib/jwt-utils';

async function getSessionCount(userId: string): Promise<number> {
  try {
    const db = await getDatabase();
    const tasks = db.collection('tasks');
    const count = await tasks.countDocuments({ 
      userId: new ObjectId(userId), 
      status: 'completed' 
    });
    return count;
  } catch (error) {
    console.error('Failed to get session count:', error);
    return 0;
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = getUserStringIdFromRequest(request);
    const sessionData = await request.json();

    // Validate and sanitize input data
    const studySession: StudySession = {
      id: String(sessionData.id || `session_${Date.now()}`),
      taskName: String(sessionData.taskName || 'Study Session'),
      duration: Math.max(1, Math.floor(Number(sessionData.duration) || 1)),
      score: Math.max(0, Math.min(100, Math.floor(Number(sessionData.score) || 0))),
      points: Math.max(0, Math.floor(Number(sessionData.points) || 0)),
      completedAt: new Date(),
      quizAnswers: Array.isArray(sessionData.quizAnswers) ? sessionData.quizAnswers.map((qa: QuizAnswer) => ({
        questionIndex: Math.max(0, Math.floor(Number(qa.questionIndex) || 0)),
        answer: String(qa.selectedAnswer || ''),
        correct: Boolean(qa.isCorrect)
      })) : [],
    };

    await AtlasUserService.addStudySession(userId, studySession);

    // Process achievements and badges after session is saved
    try {
      const user = await AtlasUserService.getUserById(userId);
      if (user && user.progress) {
        const achievements = [];
        const badges = [];
        
        // Get current session count from database
        const sessionCount = await getSessionCount(userId);
        
        // Check for first session achievement
        if (sessionCount === 1) {
          achievements.push('first-session');
          badges.push('first-quiz');
        }

        // Check for marathon study achievement (2 hours in one session)
        if (studySession.duration >= 120) {
          achievements.push('marathon-study');
        }

        // Check for perfect score badge
        if (studySession.score === 100) {
          badges.push('perfect-score');
        }

        // Check for scholar badge (10 quizzes)
        if (sessionCount >= 10) {
          badges.push('scholar');
        }

        // Check for points badge (after points are updated)
        const updatedUser = await AtlasUserService.getUserById(userId);
        if (updatedUser && updatedUser.progress && updatedUser.progress.points >= 100) {
          badges.push('points-100');
        }

        // Check for streak badges
        if (updatedUser && updatedUser.progress && updatedUser.progress.streak >= 7) {
          badges.push('streak-7');
        }

        // Update achievements and badges
        for (const achievementId of achievements) {
          try {
            await AtlasUserService.updateAchievement(userId, achievementId, true);
          } catch (error) {
            console.warn(`Failed to update achievement ${achievementId}:`, error);
          }
        }

        for (const badgeId of badges) {
          try {
            await AtlasUserService.updateBadge(userId, badgeId, true);
          } catch (error) {
            console.warn(`Failed to update badge ${badgeId}:`, error);
          }
        }

        // Update quest progress
        try {
          await AtlasUserService.updateQuest(userId, 'study-60', studySession.duration);
          await AtlasUserService.updateQuest(userId, 'quiz-5', 1);
        } catch (error) {
          console.warn('Failed to update quest progress:', error);
        }
      }
    } catch (error) {
      console.warn('Achievement processing failed (session still saved):', error);
      // Don't fail the entire request if achievements fail
    }

    return NextResponse.json({
      success: true,
      session: studySession,
    });
  } catch (error: unknown) {
    console.error('Add study session error:', error);
    
    // Provide more specific error messages
    if (error instanceof Error && error.name === 'JsonWebTokenError') {
      return NextResponse.json(
        { error: 'Invalid authentication token' },
        { status: 401 }
      );
    } else if (error instanceof Error && error.name === 'TokenExpiredError') {
      return NextResponse.json(
        { error: 'Authentication token has expired' },
        { status: 401 }
      );
    } else if (error instanceof Error && error.message === 'No token provided') {
      return NextResponse.json(
        { error: 'No authentication token provided' },
        { status: 401 }
      );
    } else {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : 'Failed to save study session' },
        { status: 500 }
      );
    }
  }
}

export async function GET(request: NextRequest) {
  try {
    const userId = getUserStringIdFromRequest(request);
    
    // Add performance timing
    const startTime = Date.now();
    const sessions = await AtlasUserService.getStudySessionsWithTimeData(userId);
    const endTime = Date.now();
    
    // Log slow queries for optimization
    if (endTime - startTime > 1000) {
      console.warn(`⚠️ Slow query: getStudySessionsWithTimeData took ${endTime - startTime}ms`);
    }

    return NextResponse.json({
      sessions,
      _meta: {
        count: sessions.length,
        queryTime: endTime - startTime
      }
    }, {
      headers: {
        'Cache-Control': 'public, max-age=60, stale-while-revalidate=300', // Cache for 1 minute
      }
    });
  } catch (error: unknown) {
    console.error('Get study sessions error:', error);
    
    // Provide more specific error messages
    if (error instanceof Error && error.name === 'JsonWebTokenError') {
      return NextResponse.json(
        { error: 'Invalid authentication token' },
        { status: 401 }
      );
    } else if (error instanceof Error && error.name === 'TokenExpiredError') {
      return NextResponse.json(
        { error: 'Authentication token has expired' },
        { status: 401 }
      );
    } else if (error instanceof Error && error.message === 'No token provided') {
      return NextResponse.json(
        { error: 'No authentication token provided' },
        { status: 401 }
      );
    } else {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : 'Failed to retrieve study sessions' },
        { status: 500 }
      );
    }
  }
}