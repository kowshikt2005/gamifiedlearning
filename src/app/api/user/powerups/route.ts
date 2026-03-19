import { NextRequest, NextResponse } from 'next/server';
import { GamificationService } from '@/lib/services/gamification-service';
import { getUserIdFromRequest } from '@/lib/jwt-utils';

export async function POST(request: NextRequest) {
  try {
    const userId = getUserIdFromRequest(request);
    const { type, cost } = await request.json();

    if (!type || !cost) {
      return NextResponse.json(
        { error: 'Power-up type and cost are required' },
        { status: 400 }
      );
    }

    const success = await GamificationService.activatePowerUp(userId, type, cost);

    if (success) {
      return NextResponse.json({ 
        success: true, 
        message: `${type} power-up activated for 1 hour!` 
      });
    } else {
      return NextResponse.json(
        { error: 'Unable to activate power-up. Check your points or if power-up is already active.' },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Activate power-up error:', error);
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const userId = getUserIdFromRequest(request);
    const stats = await GamificationService.getUserStats(userId);

    if (!stats) {
      return NextResponse.json({ powerUps: [] });
    }

    // Return active power-ups
    const activePowerUps = stats.powerUps.filter(p => 
      p.active && p.expiresAt && p.expiresAt > new Date()
    );

    return NextResponse.json({ 
      powerUps: activePowerUps,
      availablePowerUps: [
        { type: 'points', name: 'Points Booster', cost: 100, description: '2x points for 1 hour' },
        { type: 'time', name: 'Time Extender', cost: 150, description: '1.5x study efficiency for 1 hour' },
        { type: 'streak', name: 'Streak Protector', cost: 200, description: 'Protects your streak for 1 hour' }
      ]
    });
  } catch (error) {
    console.error('Get power-ups error:', error);
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }
}