import { NextRequest, NextResponse } from 'next/server';
import { performanceMonitor } from '@/lib/performance-monitor';
import { getDatabaseHealth } from '@/lib/mongodb';
import jwt from 'jsonwebtoken';

async function getUserFromToken(request: NextRequest) {
  const authHeader = request.headers.get('authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('No token provided');
  }

  const token = authHeader.substring(7);
  const decoded = jwt.verify(token, process.env.NEXTAUTH_SECRET || 'fallback-secret') as {
    userId: string;
    email: string;
  };

  return decoded;
}

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromToken(request);

    // Simple admin check - in production, you'd have proper role-based access
    if (!user.email.includes('admin') && !user.email.includes('test')) {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 403 }
      );
    }

    const url = new URL(request.url);
    const operation = url.searchParams.get('operation');

    if (operation) {
      // Get stats for specific operation
      const stats = performanceMonitor.getStats(operation);
      return NextResponse.json({
        operation,
        stats,
        recentMetrics: performanceMonitor.getSlowOperations(5)
          .filter(m => m.name === operation)
      });
    }

    // Get overall performance overview
    const operationNames = performanceMonitor.getOperationNames();
    const overview = operationNames.map(name => ({
      name,
      stats: performanceMonitor.getStats(name)
    }));

    const slowOperations = performanceMonitor.getSlowOperations(10);

    // Get database health and connection statistics
    const databaseHealth = await getDatabaseHealth();

    return NextResponse.json({
      performance: {
        overview,
        slowOperations,
        totalOperations: operationNames.length
      },
      database: {
        connected: databaseHealth.connected,
        connectionStats: databaseHealth.connectionStats,
        error: databaseHealth.error
      },
      system: {
        timestamp: new Date().toISOString(),
        nodeEnv: process.env.NODE_ENV,
        platform: process.platform
      }
    });

  } catch (error: unknown) {
    console.error('Performance monitoring error:', error);

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
        { error: error instanceof Error ? error.message : 'Failed to get performance data' },
        { status: 500 }
      );
    }
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await getUserFromToken(request);

    // Simple admin check
    if (!user.email.includes('admin') && !user.email.includes('test')) {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 403 }
      );
    }

    performanceMonitor.clear();

    return NextResponse.json({
      success: true,
      message: 'Performance metrics cleared'
    });

  } catch (error: unknown) {
    console.error('Clear performance metrics error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to clear metrics' },
      { status: 500 }
    );
  }
}