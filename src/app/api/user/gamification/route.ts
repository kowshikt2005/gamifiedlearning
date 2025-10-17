import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { authenticateRequest } from '@/lib/auth-middleware';
import { GamificationService } from '@/lib/services/gamification-service';
import { createErrorResponse } from '@/lib/api-error-handler';
import { performanceMonitor } from '@/lib/performance-monitor';

// Request validation schemas
const StudySessionSchema = z.object({
  taskName: z.string().min(1).max(200),
  duration: z.number().min(0).max(480), // Max 8 hours
  completedSuccessfully: z.boolean(),
  quizScore: z.number().min(0).max(100).optional(),
  aiQuestionsAsked: z.number().min(0).max(100).optional()
});

const QuizCompletionSchema = z.object({
  correctAnswers: z.number().min(0),
  wrongAnswers: z.number().min(0),
  answersRevealed: z.number().min(0),
  totalQuestions: z.number().min(1).max(50),
  timeSpent: z.number().min(0).optional(),
  sessionId: z.string().optional()
});

const PowerUpPurchaseSchema = z.object({
  powerUpId: z.string().min(1)
});

/**
 * GET /api/user/gamification - Get user's gamification stats
 */
export async function GET(request: NextRequest) {
  const endTimer = performanceMonitor.startTimer('api_get_gamification');
  
  try {
    const user = await authenticateRequest(request);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const stats = await GamificationService.getUserStats(user.userId);
    if (!stats) {
      return NextResponse.json(
        { success: false, error: 'User stats not found' },
        { status: 404 }
      );
    }

    // Clean up expired power-ups
    const activePowerUps = stats.activePowerUps.filter(
      powerUp => powerUp.expiresAt > new Date()
    );

    return NextResponse.json({
      success: true,
      data: {
        ...stats,
        activePowerUps
      }
    });

  } catch (error) {
    console.error('Get gamification stats error:', error);
    return createErrorResponse(error);
  } finally {
    endTimer();
  }
}

/**
 * POST /api/user/gamification/study-session - Process study session completion
 */
export async function POST(request: NextRequest) {
  const endTimer = performanceMonitor.startTimer('api_process_study_session');
  
  try {
    const user = await authenticateRequest(request);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const url = new URL(request.url);
    const action = url.searchParams.get('action');

    switch (action) {
      case 'study-session': {
        const sessionData = StudySessionSchema.parse(body);
        
        const result = await GamificationService.processStudySession(
          user.userId,
          sessionData
        );

        return NextResponse.json({
          success: true,
          data: result
        });
      }

      case 'quiz-completion': {
        const quizData = QuizCompletionSchema.parse(body);
        
        const result = await GamificationService.processQuizCompletion(
          user.userId,
          quizData
        );

        return NextResponse.json({
          success: true,
          data: result
        });
      }

      case 'purchase-powerup': {
        const { powerUpId } = PowerUpPurchaseSchema.parse(body);
        
        const success = await GamificationService.purchasePowerUp(
          user.userId,
          powerUpId
        );

        if (!success) {
          return NextResponse.json(
            { success: false, error: 'Unable to purchase power-up. Check your points balance and power-up availability.' },
            { status: 400 }
          );
        }

        return NextResponse.json({
          success: true,
          message: 'Power-up purchased successfully'
        });
      }

      case 'use-coin': {
        const success = await GamificationService.consumeCoin(user.userId);
        
        if (!success) {
          return NextResponse.json(
            { success: false, error: 'Cannot use coin. Daily limit reached.' },
            { status: 400 }
          );
        }

        return NextResponse.json({
          success: true,
          message: 'Coin used successfully'
        });
      }

      default:
        return NextResponse.json(
          { success: false, error: 'Invalid action specified' },
          { status: 400 }
        );
    }

  } catch (error) {
    console.error('Process gamification action error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid request data',
          details: error.errors.map(e => `${e.path.join('.')}: ${e.message}`)
        },
        { status: 400 }
      );
    }
    
    return createErrorResponse(error);
  } finally {
    endTimer();
  }
}