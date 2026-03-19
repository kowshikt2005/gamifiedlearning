import { NextRequest, NextResponse } from 'next/server';
import { GamificationService } from '@/lib/services/gamification-service';
import { getDatabase } from '@/lib/mongodb';
import { getUserIdFromRequest } from '@/lib/jwt-utils';

export async function GET(request: NextRequest) {
  try {
    const userId = getUserIdFromRequest(request);
    const url = new URL(request.url);
    const type = url.searchParams.get('type');
    const days = parseInt(url.searchParams.get('days') || '30');

    switch (type) {
      case 'study-time-trend':
        const studyTimeTrend = await GamificationService.getStudyTimeTrend(userId, days);
        return NextResponse.json({ data: studyTimeTrend });

      case 'recent-sessions':
        const limit = parseInt(url.searchParams.get('limit') || '10');
        const recentSessions = await GamificationService.getRecentStudySessions(userId, limit);
        return NextResponse.json({ sessions: recentSessions });

      case 'overall-stats':
        const stats = await GamificationService.getUserStats(userId);
        if (!stats) {
          return NextResponse.json({ 
            totalStudyTime: 0,
            totalPoints: 0,
            averageScore: 0,
            totalSessions: 0
          });
        }

        // Calculate additional stats
        const db = await getDatabase();
        const [totalSessions, averageScore] = await Promise.all([
          db.collection('tasks').countDocuments({ userId, status: 'completed' }),
          db.collection('quiz').aggregate([
            { $match: { userId, completed: true } },
            { $group: { _id: null, avgScore: { $avg: '$score' } } }
          ]).toArray()
        ]);

        return NextResponse.json({
          totalStudyTime: stats.totalStudyTime,
          totalPoints: stats.points,
          averageScore: averageScore[0]?.avgScore || 0,
          totalSessions,
          level: stats.level,
          streak: stats.streak,
          quizAccuracy: stats.quizAccuracy
        });

      default:
        return NextResponse.json(
          { error: 'Invalid analytics type' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Get analytics error:', error);
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }
}