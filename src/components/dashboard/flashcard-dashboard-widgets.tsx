'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import Link from 'next/link';
import { 
  Library, 
  BookOpen, 
  Brain, 
  RotateCcw, 
  TrendingUp, 
  Clock, 
  Target,
  ChevronRight,
  RefreshCw
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { SavedFlashcard } from '@/lib/models/flashcard';

interface FlashcardStats {
  total: number;
  saved: number;
  known: number;
  review: number;
  totalReviews: number;
  averageReviews: number;
  recentActivity: number;
  studyStreak: number;
}

interface FlashcardDashboardWidgetsProps {
  className?: string;
}

export function FlashcardDashboardWidgets({ className }: FlashcardDashboardWidgetsProps) {
  const [stats, setStats] = useState<FlashcardStats>({
    total: 0,
    saved: 0,
    known: 0,
    review: 0,
    totalReviews: 0,
    averageReviews: 0,
    recentActivity: 0,
    studyStreak: 0,
  });
  const [recentFlashcards, setRecentFlashcards] = useState<SavedFlashcard[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFetching, setIsFetching] = useState(false);
  const hasFetched = useRef(false);

  // Helper functions defined before useCallback
  const calculateStudyStreak = (flashcards: SavedFlashcard[]): number => {
    if (flashcards.length === 0) return 0;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    let streak = 0;
    const currentDate = new Date(today);

    for (let i = 0; i < 30; i++) {
      const dayStart = new Date(currentDate);
      const dayEnd = new Date(currentDate);
      dayEnd.setHours(23, 59, 59, 999);

      const hasActivity = flashcards.some((f: SavedFlashcard) => {
        const reviewDate = f.lastReviewed ? new Date(f.lastReviewed) : null;
        const createDate = new Date(f.createdAt);
        
        return (reviewDate && reviewDate >= dayStart && reviewDate <= dayEnd) ||
               (createDate >= dayStart && createDate <= dayEnd);
      });

      if (hasActivity) {
        streak++;
      } else if (i > 0) {
        break;
      }

      currentDate.setDate(currentDate.getDate() - 1);
    }

    return streak;
  };

  const calculateFlashcardStats = useCallback((flashcards: SavedFlashcard[]): FlashcardStats => {
    const total = flashcards.length;
    const saved = flashcards.filter((f: SavedFlashcard) => f.status === 'saved').length;
    const known = flashcards.filter((f: SavedFlashcard) => f.status === 'known').length;
    const review = flashcards.filter((f: SavedFlashcard) => f.status === 'review').length;
    const totalReviews = flashcards.reduce((acc: number, f: SavedFlashcard) => acc + f.reviewCount, 0);
    const averageReviews = total > 0 ? Math.round((totalReviews / total) * 10) / 10 : 0;
    
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const recentActivity = flashcards.filter((f: SavedFlashcard) => 
      f.lastReviewed && new Date(f.lastReviewed) > sevenDaysAgo
    ).length;

    const studyStreak = calculateStudyStreak(flashcards);

    return {
      total,
      saved,
      known,
      review,
      totalReviews,
      averageReviews,
      recentActivity,
      studyStreak,
    };
  }, [calculateStudyStreak]);

  const getRecentFlashcards = (flashcards: SavedFlashcard[]): SavedFlashcard[] => {
    return flashcards
      .sort((a: SavedFlashcard, b: SavedFlashcard) => {
        const aDate = new Date(a.lastReviewed || a.createdAt);
        const bDate = new Date(b.lastReviewed || b.createdAt);
        return bDate.getTime() - aDate.getTime();
      })
      .slice(0, 5);
  };

  // Fetch flashcard statistics and recent activity
  const fetchFlashcardData = useCallback(async () => {
    if (isFetching) return;
    
    try {
      setIsFetching(true);
      setIsLoading(true);
      setError(null);
      
      const token = localStorage.getItem('auth-token');
      if (!token) {
        setIsLoading(false);
        hasFetched.current = true;
        return;
      }

      const response = await fetch('/api/study/save-flashcards', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          setIsLoading(false);
          hasFetched.current = true;
          return;
        }
        if (response.status === 404) {
          setStats({
            total: 0,
            saved: 0,
            known: 0,
            review: 0,
            totalReviews: 0,
            averageReviews: 0,
            recentActivity: 0,
            studyStreak: 0,
          });
          setRecentFlashcards([]);
          setIsLoading(false);
          hasFetched.current = true;
          return;
        }
        throw new Error(`HTTP ${response.status}: Failed to fetch flashcard data`);
      }

      const data = await response.json();
      if (data.success && data.data.flashcards) {
        const flashcards = data.data.flashcards;
        
        const calculatedStats = calculateFlashcardStats(flashcards);
        setStats(calculatedStats);

        const recentCards = getRecentFlashcards(flashcards);
        setRecentFlashcards(recentCards);
      }
      hasFetched.current = true;
    } catch (err: unknown) {
      console.error('Error fetching flashcard data:', err);
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      if (!errorMessage.includes('Failed to fetch')) {
        setError(errorMessage || 'Failed to load flashcard data');
      }
      hasFetched.current = true;
    } finally {
      setIsLoading(false);
      setIsFetching(false);
    }
  }, [calculateFlashcardStats, isFetching]);

  // Memoized calculations
  const knowledgeProgress = useMemo(() => {
    if (stats.total === 0) return 0;
    return Math.round((stats.known / stats.total) * 100);
  }, [stats.known, stats.total]);

  useEffect(() => {
    if (!hasFetched.current) {
      const token = localStorage.getItem('auth-token');
      if (token) {
        fetchFlashcardData();
      } else {
        setIsLoading(false);
        hasFetched.current = true;
      }
    }
  }, [fetchFlashcardData]);

  if (isLoading) {
    return (
      <div className={className}>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-8 w-16" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-3 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={className}>
        <Card>
          <CardContent className="p-6">
            <div className="text-center text-muted-foreground">
              <Library className="h-8 w-8 mx-auto mb-2" />
              <p className="text-sm">Unable to load flashcard data</p>
              <Button
                variant="outline"
                size="sm"
                onClick={fetchFlashcardData}
                className="mt-2"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Retry
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (stats.total === 0) {
    return (
      <div className={className}>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Library className="h-5 w-5" />
              Flashcard Progress
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-6">
              <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-medium mb-2">No flashcards yet</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Create your first flashcards from a study session to start tracking your progress.
              </p>
              <Link href="/dashboard/create-task">
                <Button size="sm">
                  Start Study Session
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className={className}>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* Flashcard Overview */}
        <Card className="gamify-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Library className="h-4 w-4" />
              Flashcard Collection
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold">{stats.total}</span>
                <Badge variant="secondary" className="text-xs">
                  Total Cards
                </Badge>
              </div>
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div className="text-center">
                  <div className="font-medium text-blue-600">{stats.saved}</div>
                  <div className="text-muted-foreground">Saved</div>
                </div>
                <div className="text-center">
                  <div className="font-medium text-green-600">{stats.known}</div>
                  <div className="text-muted-foreground">Known</div>
                </div>
                <div className="text-center">
                  <div className="font-medium text-orange-600">{stats.review}</div>
                  <div className="text-muted-foreground">Review</div>
                </div>
              </div>
              <Link href="/dashboard/saved-flashcards">
                <Button variant="outline" size="sm" className="w-full">
                  <BookOpen className="h-4 w-4 mr-2" />
                  View All
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Knowledge Progress */}
        <Card className="gamify-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Brain className="h-4 w-4" />
              Knowledge Mastery
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold">{knowledgeProgress}%</span>
                <Badge variant={knowledgeProgress >= 70 ? "default" : "secondary"} className="text-xs">
                  {knowledgeProgress >= 70 ? "Great!" : "Keep Going"}
                </Badge>
              </div>
              <Progress value={knowledgeProgress} className="h-2" />
              <div className="text-xs text-muted-foreground">
                {stats.known} of {stats.total} cards mastered
              </div>
              {stats.review > 0 && (
                <Link href="/dashboard/saved-flashcards?status=review">
                  <Button variant="outline" size="sm" className="w-full">
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Review {stats.review} Cards
                  </Button>
                </Link>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Study Activity */}
        <Card className="gamify-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Study Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold">{stats.studyStreak}</span>
                <Badge variant={stats.studyStreak >= 3 ? "default" : "secondary"} className="text-xs">
                  Day Streak
                </Badge>
              </div>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Recent Activity</span>
                  <span className="font-medium">{stats.recentActivity} cards</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Avg Reviews</span>
                  <span className="font-medium">{stats.averageReviews}</span>
                </div>
              </div>
              <div className="text-xs text-muted-foreground">
                Last 7 days activity
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Flashcards */}
      {recentFlashcards.length > 0 && (
        <Card className="mt-4 gamify-card">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Recent Flashcards
              </CardTitle>
              <Link href="/dashboard/saved-flashcards">
                <Button variant="ghost" size="sm">
                  View All
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentFlashcards.map((flashcard) => (
                <div
                  key={flashcard._id?.toString()}
                  className="flex items-start justify-between p-3 rounded-lg border bg-card/50 hover:bg-card/80 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">
                      {flashcard.question}
                    </div>
                    <div className="text-xs text-muted-foreground truncate mt-1">
                      {flashcard.pdfTitle}
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge
                        variant={
                          flashcard.status === 'known' ? 'default' :
                          flashcard.status === 'saved' ? 'secondary' : 'destructive'
                        }
                        className="text-xs capitalize"
                      >
                        {flashcard.status}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {flashcard.reviewCount} reviews
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      <Card className="mt-4 gamify-card">
        <CardHeader>
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Target className="h-4 w-4" />
            Quick Actions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3">
            <Link href="/dashboard/saved-flashcards?status=review">
              <Button variant="outline" size="sm" className="w-full justify-start">
                <RotateCcw className="h-4 w-4 mr-2" />
                Review Cards
              </Button>
            </Link>
            <Link href="/dashboard/create-task">
              <Button variant="outline" size="sm" className="w-full justify-start">
                <BookOpen className="h-4 w-4 mr-2" />
                New Session
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}