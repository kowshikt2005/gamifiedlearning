'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { cachedFetch } from '@/lib/api-cache';

export interface StudySessionData {
  date: string;
  duration: number;
  score: number;
  points: number;
}

export interface StudyTrendData {
  date: string;
  minutes: number;
  sessionCount: number;
}

export function useStudyData() {
  const { user } = useAuth();
  const [sessionData, setSessionData] = useState<StudySessionData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  // Removed lastFetch state as it's no longer needed with caching

  const fetchSessionData = useCallback(async (forceRefresh = false) => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const token = localStorage.getItem('auth-token');
      if (!token) {
        setIsLoading(false);
        return;
      }

      const options = {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      };

      // Use cached fetch with 5-minute TTL, or force refresh
      const data = forceRefresh 
        ? await cachedFetch('/api/user/study-session', options, 0) // 0 TTL = no cache
        : await cachedFetch('/api/user/study-session', options, 5 * 60 * 1000); // 5 minutes

      setSessionData((data as { sessions?: StudySessionData[] }).sessions || []);
    } catch (error) {
      console.error('Failed to fetch session data:', error);
      setSessionData([]);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // Initial fetch only when user changes
  useEffect(() => {
    if (user) {
      fetchSessionData();
    }
  }, [user, fetchSessionData]); // Include fetchSessionData dependency

  // Remove auto-refresh interval - rely on cache and manual refresh instead

  // Memoize trend data calculation for performance
  const getTrendData = useMemo(() => (days: number = 7): StudyTrendData[] => {
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - (days * 24 * 60 * 60 * 1000));

    // Filter sessions within the date range
    const filteredSessions = sessionData.filter(session => {
      const sessionDate = new Date(session.date);
      return sessionDate >= startDate && sessionDate <= endDate;
    });

    // Group by date and aggregate
    const trendMap: { [key: string]: { minutes: number; sessionCount: number } } = {};
    
    filteredSessions.forEach(session => {
      const dateKey = session.date;
      if (!trendMap[dateKey]) {
        trendMap[dateKey] = { minutes: 0, sessionCount: 0 };
      }
      trendMap[dateKey].minutes += session.duration;
      trendMap[dateKey].sessionCount += 1;
    });

    // Fill missing dates with 0 values and format for chart
    const result: StudyTrendData[] = [];
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(endDate.getTime() - (i * 24 * 60 * 60 * 1000));
      const dateKey = date.toISOString().split('T')[0];
      const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
      
      result.push({
        date: dayName,
        minutes: trendMap[dateKey]?.minutes || 0,
        sessionCount: trendMap[dateKey]?.sessionCount || 0,
      });
    }

    return result;
  }, [sessionData]);

  // Memoize stats calculation for performance
  const getStats = useMemo(() => {
    const totalStudyTime = sessionData.reduce((total, session) => total + session.duration, 0);
    const averageScore = sessionData.length > 0 
      ? sessionData.reduce((total, session) => total + session.score, 0) / sessionData.length 
      : 0;
    const totalPoints = sessionData.reduce((total, session) => total + session.points, 0);
    const totalSessions = sessionData.length;

    // Calculate today's study time
    const today = new Date().toISOString().split('T')[0];
    const todaysSessions = sessionData.filter(session => session.date === today);
    const todaysStudyTime = todaysSessions.reduce((total, session) => total + session.duration, 0);

    return {
      totalStudyTime,
      averageScore,
      totalPoints,
      totalSessions,
      todaysStudyTime,
    };
  }, [sessionData]);

  // Validate data consistency
  const validateData = useCallback(() => {
    const trendData = getTrendData(7);
    
    // Data validation completed
    
    return {
      isValid: getStats.totalSessions >= 0 && getStats.totalStudyTime >= 0,
      stats: getStats,
      trendData,
    };
  }, [getStats, getTrendData]);

  return {
    sessionData,
    isLoading,
    fetchSessionData,
    getTrendData,
    getStats,
    validateData,
  };
}