'use client';

import { useEffect, useState } from 'react';
import { useGamification } from '@/contexts/gamification-context';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RefreshCw, CheckCircle, AlertCircle, Wifi, WifiOff } from 'lucide-react';

export function SyncStatus() {
  const [syncStatus, setSyncStatus] = useState<'synced' | 'syncing' | 'error' | 'offline'>('synced');
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const gamification = useGamification();

  // Test sync functionality
  const handleManualSync = async () => {
    setSyncStatus('syncing');
    try {
      await gamification.refreshStats();
      const success = true;
      if (success) {
        setSyncStatus('synced');
        setLastSync(new Date());
      } else {
        setSyncStatus('error');
      }
    } catch {
      setSyncStatus('error');
    }
  };

  // Test fetch functionality
  const handleManualFetch = async () => {
    setSyncStatus('syncing');
    try {
      await gamification.refreshStats();
      const success = true;
      if (success) {
        setSyncStatus('synced');
        setLastSync(new Date());
      } else {
        setSyncStatus('error');
      }
    } catch {
      setSyncStatus('error');
    }
  };

  // Check online status
  useEffect(() => {
    const handleOnline = () => setSyncStatus('synced');
    const handleOffline = () => setSyncStatus('offline');

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const getStatusIcon = () => {
    switch (syncStatus) {
      case 'synced':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'syncing':
        return <RefreshCw className="h-4 w-4 animate-spin text-blue-500" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'offline':
        return <WifiOff className="h-4 w-4 text-gray-500" />;
      default:
        return <Wifi className="h-4 w-4" />;
    }
  };

  const getStatusText = () => {
    switch (syncStatus) {
      case 'synced':
        return 'Synced';
      case 'syncing':
        return 'Syncing...';
      case 'error':
        return 'Sync Error';
      case 'offline':
        return 'Offline';
      default:
        return 'Unknown';
    }
  };

  return (
    <div className="flex items-center gap-2 text-sm">
      <Badge variant="outline" className="flex items-center gap-1">
        {getStatusIcon()}
        {getStatusText()}
      </Badge>
      
      {lastSync && (
        <span className="text-xs text-muted-foreground">
          Last: {lastSync.toLocaleTimeString()}
        </span>
      )}
      
      <div className="flex gap-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleManualSync}
          disabled={syncStatus === 'syncing'}
          className="h-6 px-2 text-xs"
        >
          Push
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleManualFetch}
          disabled={syncStatus === 'syncing'}
          className="h-6 px-2 text-xs"
        >
          Pull
        </Button>
      </div>
    </div>
  );
}