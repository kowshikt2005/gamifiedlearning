import { NextRequest, NextResponse } from 'next/server';
import { GamificationService } from '@/lib/services/gamification-service';
import { getUserIdFromRequest } from '@/lib/jwt-utils';

export async function POST(request: NextRequest) {
  try {
    const userId = getUserIdFromRequest(request);
    
    // Track chat question for Curious Mind quest
    await GamificationService.trackAIQuestion(userId);

    return NextResponse.json({
      success: true,
      message: 'Chat question tracked for Curious Mind quest'
    });
  } catch (error) {
    console.error('Track AI chat error:', error);
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }
}