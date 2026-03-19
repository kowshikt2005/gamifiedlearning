import { NextRequest, NextResponse } from 'next/server';
import { GamificationService } from '@/lib/services/gamification-service';
import { getUserIdFromRequest } from '@/lib/jwt-utils';

export async function GET(request: NextRequest) {
  try {
    const userId = getUserIdFromRequest(request);
    const stats = await GamificationService.getUserStats(userId);

    if (!stats) {
      // Initialize stats for new user
      await GamificationService.initializeUserStats(userId);
      const newStats = await GamificationService.getUserStats(userId);
      return NextResponse.json({ stats: newStats });
    }

    return NextResponse.json({ stats });
  } catch (error) {
    console.error('Get user stats error:', error);
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const userId = getUserIdFromRequest(request);
    const { pointsToAdd, studyTimeToAdd, quizScore } = await request.json();

    await GamificationService.updateUserProgress(
      userId, 
      pointsToAdd || 0, 
      studyTimeToAdd || 0, 
      quizScore
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Update user stats error:', error);
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }
}