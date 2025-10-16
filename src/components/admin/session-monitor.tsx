'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { sessionSaver } from '@/lib/session-saver';
import { studySessionCircuitBreaker } from '@/lib/circuit-breaker';
import { AlertTriangle, CheckCircle, Clock, Database, Zap } from 'lucide-react';

export function SessionMonitor() {
  const [stats, setStats] = useState({
    sessionSaver: { processed: 0, pending: 0, queued: 0 },
    circuitBreaker: { state: 'CLOSED', failureCount: 0, failureRate: 0, totalRequests: 0 }
  });

  const refreshStats = () => {
    setStats({
      sessionSaver: sessionSaver.getStats(),
      circuitBreaker: studySessionCircuitBreaker.getStats()
    });
  };

  useEffect(() => {
    refreshStats();
    
    // Auto-refresh every 5 seconds
    const interval = setInterval(refreshStats, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleClearSessions = () => {
    sessionSaver.clearProcessed();
    refreshStats();
  };

  const handleResetCircuitBreaker = () => {
    studySessionCircuitBreaker.reset();
    refreshStats();
  };

  const getCircuitBreakerColor = (state: string) => {
    switch (state) {
      case 'CLOSED': return 'bg-green-100 text-green-800';
      case 'HALF_OPEN': return 'bg-yellow-100 text-yellow-800';
      case 'OPEN': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getCircuitBreakerIcon = (state: string) => {
    switch (state) {
      case 'CLOSED': return <CheckCircle className="h-4 w-4" />;
      case 'HALF_OPEN': return <Clock className="h-4 w-4" />;
      case 'OPEN': return <AlertTriangle className="h-4 w-4" />;
      default: return <Zap className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Session Monitoring</h2>
          <p className="text-muted-foreground">
            Monitor session saving and API health
          </p>
        </div>
        <Button onClick={refreshStats} variant="outline">
          Refresh
        </Button>
      </div>

      {/* Session Saver Stats */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Session Saver Statistics
          </CardTitle>
          <CardDescription>
            Tracks session deduplication and saving
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {stats.sessionSaver.processed}
              </div>
              <p className="text-sm text-muted-foreground">Processed</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">
                {stats.sessionSaver.pending}
              </div>
              <p className="text-sm text-muted-foreground">Pending</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {stats.sessionSaver.queued}
              </div>
              <p className="text-sm text-muted-foreground">Queued</p>
            </div>
          </div>
          <div className="mt-4">
            <Button onClick={handleClearSessions} variant="outline" size="sm">
              Clear Processed Sessions
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Circuit Breaker Stats */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Circuit Breaker Status
          </CardTitle>
          <CardDescription>
            API protection and failure monitoring
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="font-medium">Circuit State</span>
              <Badge className={getCircuitBreakerColor(stats.circuitBreaker.state)}>
                {getCircuitBreakerIcon(stats.circuitBreaker.state)}
                {stats.circuitBreaker.state}
              </Badge>
            </div>
            
            <div className="grid gap-4 md:grid-cols-3">
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">
                  {stats.circuitBreaker.failureCount}
                </div>
                <p className="text-sm text-muted-foreground">Failures</p>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-amber-600">
                  {(stats.circuitBreaker.failureRate * 100).toFixed(1)}%
                </div>
                <p className="text-sm text-muted-foreground">Failure Rate</p>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {stats.circuitBreaker.totalRequests}
                </div>
                <p className="text-sm text-muted-foreground">Total Requests</p>
              </div>
            </div>

            {stats.circuitBreaker.state !== 'CLOSED' && (
              <div className="mt-4">
                <Button onClick={handleResetCircuitBreaker} variant="destructive" size="sm">
                  Reset Circuit Breaker
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Health Status */}
      <Card>
        <CardHeader>
          <CardTitle>System Health</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span>Session Deduplication</span>
              <Badge variant={stats.sessionSaver.pending === 0 ? 'default' : 'secondary'}>
                {stats.sessionSaver.pending === 0 ? 'Healthy' : 'Processing'}
              </Badge>
            </div>
            
            <div className="flex items-center justify-between">
              <span>API Circuit Breaker</span>
              <Badge variant={stats.circuitBreaker.state === 'CLOSED' ? 'default' : 'destructive'}>
                {stats.circuitBreaker.state === 'CLOSED' ? 'Healthy' : 'Degraded'}
              </Badge>
            </div>
            
            <div className="flex items-center justify-between">
              <span>Failure Rate</span>
              <Badge variant={stats.circuitBreaker.failureRate < 0.1 ? 'default' : 'destructive'}>
                {stats.circuitBreaker.failureRate < 0.1 ? 'Low' : 'High'}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}