'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { aggressiveConnectionManager } from '@/lib/aggressive-connection-manager';
import { inactivityDetector } from '@/lib/inactivity-detector';
import { Database, Activity, Zap, Clock } from 'lucide-react';

export function ConnectionMonitor() {
  const [stats, setStats] = useState({
    connections: { totalConnections: 0, activeConnections: 0, idleConnections: 0, oldestConnection: 0 },
    activity: { isActive: true, lastActivity: Date.now(), timeSinceActivity: 0 }
  });

  const refreshStats = () => {
    setStats({
      connections: aggressiveConnectionManager.getStats(),
      activity: inactivityDetector.getActivityStatus()
    });
  };

  useEffect(() => {
    refreshStats();
    
    // Auto-refresh every 2 seconds
    const interval = setInterval(refreshStats, 2000);
    return () => clearInterval(interval);
  }, []);

  const handleForceCleanup = async () => {
    await aggressiveConnectionManager.forceCleanup();
    refreshStats();
  };

  const formatTime = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}m`;
  };

  const getConnectionStatus = () => {
    const { totalConnections, activeConnections } = stats.connections;
    if (totalConnections === 0) return { color: 'bg-green-100 text-green-800', text: 'No Connections' };
    if (activeConnections > 2) return { color: 'bg-red-100 text-red-800', text: 'High Usage' };
    if (activeConnections > 0) return { color: 'bg-yellow-100 text-yellow-800', text: 'Active' };
    return { color: 'bg-blue-100 text-blue-800', text: 'Idle' };
  };

  const getActivityStatus = () => {
    const { isActive, timeSinceActivity } = stats.activity;
    if (isActive && timeSinceActivity < 300000) return { color: 'bg-green-100 text-green-800', text: 'Active' }; // 5 minutes
    if (timeSinceActivity < 900000) return { color: 'bg-yellow-100 text-yellow-800', text: 'Recent' }; // 15 minutes
    return { color: 'bg-red-100 text-red-800', text: 'Inactive' };
  };

  const connectionStatus = getConnectionStatus();
  const activityStatus = getActivityStatus();

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Connection Monitor</h2>
          <p className="text-muted-foreground">
            Real-time MongoDB connection and activity tracking
          </p>
        </div>
        <div className="space-x-2">
          <Button onClick={refreshStats} variant="outline" size="sm">
            Refresh
          </Button>
          <Button onClick={handleForceCleanup} variant="destructive" size="sm">
            Force Cleanup
          </Button>
        </div>
      </div>

      {/* Connection Statistics */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Connections</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.connections.totalConnections}</div>
            <Badge className={connectionStatus.color}>
              {connectionStatus.text}
            </Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Connections</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {stats.connections.activeConnections}
            </div>
            <p className="text-xs text-muted-foreground">
              {stats.connections.idleConnections} idle
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">User Activity</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <Badge className={activityStatus.color}>
              {activityStatus.text}
            </Badge>
            <p className="text-xs text-muted-foreground mt-1">
              {formatTime(stats.activity.timeSinceActivity)} ago
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Oldest Connection</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">
              {formatTime(stats.connections.oldestConnection)}
            </div>
            <p className="text-xs text-muted-foreground">
              Age of oldest connection
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Status Details */}
      <Card>
        <CardHeader>
          <CardTitle>Connection Management Status</CardTitle>
          <CardDescription>
            Automatic connection cleanup and inactivity detection
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="font-medium">Auto-Cleanup</span>
              <Badge variant="default">Enabled</Badge>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="font-medium">Inactivity Detection</span>
              <Badge variant="default">Active</Badge>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="font-medium">Idle Timeout</span>
              <Badge variant="secondary">10 minutes</Badge>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="font-medium">Max Pool Size</span>
              <Badge variant="secondary">5 connections</Badge>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="font-medium">Min Pool Size</span>
              <Badge variant="secondary">1 connection</Badge>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="font-medium">Inactivity Timeout</span>
              <Badge variant="secondary">15 minutes</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recommendations */}
      {stats.connections.totalConnections > 2 && (
        <Card className="border-amber-200 bg-amber-50">
          <CardHeader>
            <CardTitle className="text-amber-800">⚠️ High Connection Usage</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-amber-700">
              You have {stats.connections.totalConnections} connections open. Consider:
            </p>
            <ul className="list-disc list-inside text-amber-700 mt-2 space-y-1">
              <li>Closing unused browser tabs</li>
              <li>Restarting your development server</li>
              <li>Running the force cleanup</li>
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}