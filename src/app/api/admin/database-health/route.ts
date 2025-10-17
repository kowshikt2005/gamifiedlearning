import { NextRequest, NextResponse } from 'next/server';
import { getDatabaseHealth } from '@/lib/mongodb';
import { aggressiveConnectionManager } from '@/lib/aggressive-connection-manager';

/**
 * Database Health Check API
 * GET /api/admin/database-health
 * 
 * Returns connection statistics and health status
 * Production-ready monitoring endpoint
 */
export async function GET(_request: NextRequest) {
  try {
    // Get comprehensive health information
    const health = await getDatabaseHealth();
    const activityStatus = aggressiveConnectionManager.getActivityStatus();
    
    // Add timestamp and additional metadata
    const response = {
      timestamp: new Date().toISOString(),
      status: health.connected ? 'healthy' : 'unhealthy',
      database: {
        connected: health.connected,
        error: health.error
      },
      connections: {
        total: health.connectionStats.totalConnections,
        active: health.connectionStats.activeConnections,
        idle: health.connectionStats.idleConnections,
        oldestConnectionAge: Math.round(health.connectionStats.oldestConnection / 1000), // seconds
        systemInactiveTime: Math.round(health.connectionStats.systemInactiveTime / 1000), // seconds
        cleanupActive: health.connectionStats.cleanupActive,
        totalRequests: health.connectionStats.totalRequests,
        averageRequestsPerConnection: Math.round(health.connectionStats.averageRequestsPerConnection * 100) / 100
      },
      activity: {
        isActive: activityStatus.isActive,
        inactiveTime: Math.round(activityStatus.inactiveTime / 1000), // seconds
        cleanupActive: activityStatus.cleanupActive,
        lastActivity: activityStatus.lastActivity.toISOString(),
        totalRequests: activityStatus.totalRequests
      },
      thresholds: {
        systemInactivityThreshold: 900, // 15 minutes in seconds
        connectionIdleTimeout: 600, // 10 minutes in seconds
        maxConnections: 3 // M0 tier limit
      }
    };

    // Return appropriate HTTP status
    const status = health.connected ? 200 : 503;
    
    return NextResponse.json(response, { status });
  } catch (error) {
    console.error('Database health check failed:', error);
    
    return NextResponse.json({
      timestamp: new Date().toISOString(),
      status: 'error',
      error: 'Health check failed',
      database: {
        connected: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }, { status: 500 });
  }
}