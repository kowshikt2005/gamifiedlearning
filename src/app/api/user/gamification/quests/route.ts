import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth-middleware';
import { GamificationService } from '@/lib/services/gamification-service';
import { createErrorResponse } from '@/lib/api-error-handler';
import { performanceMonitor } from '@/lib/performance-monitor';

/**
 * GET /api/user/gamification/quests - Get active quests
 */
export async function GET(request: NextRequest) {
  const endTimer = performanceMonitor.startTimer('api_get_quests');
  
  try {
    const user = await authenticateRequest(request);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const quests = await GamificationService.getActiveQuests(user.userId);

    return NextResponse.json({
      success: true,
      data: quests
    });

  } catch (error) {
    console.error('Get quests error:', error);
    return createErrorResponse(error);
  } finally {
    endTimer();
  }
}