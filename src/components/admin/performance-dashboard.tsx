'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/auth-context';
import { AlertTriangle, Clock, Database, Zap } from 'lucide-react';

interface PerformanceStats {
  count: number;
  averageDuration: number;
  minDuration: number;
  maxDuration: number;
  slowOperations: number;
}

interface OperationOverview {
  name: string;
  stats: PerformanceStats;
}

interface SlowOperation {
  name: string;
  duration: number;
  timestamp: number;
  metadata?: Record<string, any>;
}

interface PerformanceData {
  overview: OperationOverview[];
  slowOperations: SlowOperation[];
  totalOperations: number;
  timestamp: string;
}

export function PerformanceDashboard() {
  const { user } = useAuth();
  const [data, setData] = useState<PerformanceData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPerformanceData = async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem('auth-token');
      
      if (!token) {
        setError('No authentication token');
        return;
      }

      const response = await fetch('/api/admin/performance', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      setData(result);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch performance data');
    } finally {
      setIsLoading(false);
    }
  };

  const clearMetrics = async () => {
    try {
      const token = localStorage.getItem('auth-token');
      
      if (!token) {
        setError('No authentication token');
        return;
      }

      const response = await fetch('/api/admin/performance', {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      // Refresh data after clearing
      await fetchPerformanceData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to clear metrics');
    }
  };

  useEffect(() => {
    fetchPerformanceData();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchPerformanceData, 30000);
    return () => clearInterval(interval);
  }, []);

  if (!user?.email?.includes('admin') && !user?.email?.includes('test')) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Access Denied
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p>Admin access required to view performance metrics.</p>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Performance Dashboard</CardTitle>
          <CardDescription>Loading performance metrics...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            <div className="h-4 bg-gray-200 rounded w-2/3"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            Error
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-red-600">{error}</p>
          <Button onClick={fetchPerformanceData} className="mt-4">
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Performance Dashboard</h2>
          <p className="text-muted-foreground">
            Last updated: {data ? new Date(data.timestamp).toLocaleString() : 'Never'}
          </p>
        </div>
        <div className="space-x-2">
          <Button onClick={fetchPerformanceData} variant="outline">
            Refresh
          </Button>
          <Button onClick={clearMetrics} variant="destructive">
            Clear Metrics
          </Button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Operations</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data?.totalOperations || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Slow Operations</CardTitle>
            <AlertTriangle className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">
              {data?.slowOperations.length || 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Response Time</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data?.overview.length ? 
                Math.round(data.overview.reduce((sum, op) => sum + op.stats.averageDuration, 0) / data.overview.length) 
                : 0}ms
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Database Queries</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data?.overview.filter(op => op.name.includes('database') || op.name.includes('getStudySessionsWithTimeData')).length || 0}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Operations Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Operations Overview</CardTitle>
          <CardDescription>Performance metrics for all tracked operations</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {data?.overview.map((operation) => (
              <div key={operation.name} className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <h4 className="font-medium">{operation.name}</h4>
                  <p className="text-sm text-muted-foreground">
                    {operation.stats.count} calls • Avg: {Math.round(operation.stats.averageDuration)}ms
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {operation.stats.slowOperations > 0 && (
                    <Badge variant="destructive">
                      {operation.stats.slowOperations} slow
                    </Badge>
                  )}
                  <Badge variant={operation.stats.averageDuration > 1000 ? 'destructive' : 'secondary'}>
                    {Math.round(operation.stats.averageDuration)}ms avg
                  </Badge>
                </div>
              </div>
            ))}
            {(!data?.overview || data.overview.length === 0) && (
              <p className="text-center text-muted-foreground py-8">
                No performance data available. Operations will appear here as they are tracked.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Slow Operations */}
      {data?.slowOperations && data.slowOperations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Recent Slow Operations
            </CardTitle>
            <CardDescription>Operations that took longer than 1 second</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.slowOperations.map((operation, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <div>
                    <h4 className="font-medium text-amber-800">{operation.name}</h4>
                    <p className="text-sm text-amber-600">
                      {new Date(operation.timestamp).toLocaleString()}
                    </p>
                  </div>
                  <Badge variant="destructive">
                    {Math.round(operation.duration)}ms
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}