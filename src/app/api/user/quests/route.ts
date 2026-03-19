import { NextRequest, NextResponse } from 'next/server';
import { GamificationService } from '@/lib/services/gamification-service';
import { getUserIdFromRequest } from '@/lib/jwt-utils';

export async function GET(request: NextRequest) {
  try {
    const userId = getUserIdFromRequest(request);
    const url = new URL(request.url);
    const type = url.searchParams.get('type');

    if (type === 'active') {
      // Get active quests only
      const activeQuests = await GamificationService.getActiveQuests(userId);
      return NextResponse.json({ quests: activeQuests });
    } else {
      // Get all quests
      const stats = await GamificationService.getUserStats(userId);
      return NextResponse.json({ 
        quests: stats?.quests || [] 
      });
    }
  } catch (error) {
    console.error('Get quests error:', error);
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }
}