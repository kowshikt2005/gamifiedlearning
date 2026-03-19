import { NextRequest, NextResponse } from 'next/server';
import { GamificationService } from '@/lib/services/gamification-service';
import { getUserIdFromRequest } from '@/lib/jwt-utils';

export async function GET(request: NextRequest) {
  try {
    const userId = getUserIdFromRequest(request);
    const url = new URL(request.url);
    const type = url.searchParams.get('type');

    if (type === 'recent') {
      // Get recent achievements (last 5)
      const recentAchievements = await GamificationService.getRecentAchievements(userId);
      return NextResponse.json({ achievements: recentAchievements });
    } else {
      // Get all achievements
      const stats = await GamificationService.getUserStats(userId);
      return NextResponse.json({ 
        achievements: stats?.achievements || [] 
      });
    }
  } catch (error) {
    console.error('Get achievements error:', error);
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }
}