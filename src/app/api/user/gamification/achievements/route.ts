import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth-middleware';
import { GamificationService } from '@/lib/services/gamification-service';
import { createErrorResponse } from '@/lib/api-error-handler';
import { performanceMonitor } from '@/lib/performance-monitor';

/**
 * GET /api/user/gamification/achievements - Get recent achievements
 */
export async function GET(request: NextRequest) {
  const endTimer = performanceMonitor.startTimer('api_get_achievements');
  
  try {
    const user = await authenticateRequest(request);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const achievements = await GamificationService.getRecentAchievements(user.userId);

    return NextResponse.json({
      success: true,
      data: achievements
    });

  } catch (error) {
    console.error('Get achievements error:', error);
    return createErrorResponse(error);
  } finally {
    endTimer();
  }
}