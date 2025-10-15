'use client';

import { useState, useEffect, useCallback, useMemo, memo } from 'react';
import { Search, Filter, RefreshCw, BookOpen, Eye, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { SavedFlashcard, CardAction } from '@/lib/models/flashcard';
import { FlashcardViewer } from '@/components/study/flashcard-viewer';

interface SavedFlashcardsViewerProps {
  className?: string;
}

interface FlashcardStats {
  total: number;
  saved: number;
  known: number;
  review: number;
  totalReviews: number;
  averageReviews: number;
}

const SavedFlashcardsViewerComponent = ({ className }: SavedFlashcardsViewerProps) => {
  const [flashcards, setFlashcards] = useState<SavedFlashcard[]>([]);
  const [filteredFlashcards, setFilteredFlashcards] = useState<SavedFlashcard[]>([]);
  const [stats, setStats] = useState<FlashcardStats>({
    total: 0,
    saved: 0,
    known: 0,
    review: 0,
    totalReviews: 0,
    averageReviews: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<CardAction | 'all'>('all');
  const [selectedFlashcard, setSelectedFlashcard] = useState<SavedFlashcard | null>(null);
  const [isReviewMode, setIsReviewMode] = useState(false);

  // Rate limiting for API calls
  const [lastFetchTime, setLastFetchTime] = useState(0);

  // Fetch saved flashcards from API
  const fetchFlashcards = useCallback(async () => {
    // Prevent excessive API calls - minimum 2 seconds between fetches
    const now = Date.now();
    if (now - lastFetchTime < 2000) {
      return;
    }
    setLastFetchTime(now);

    try {
      setIsLoading(true);
      setError(null);
      
      const token = localStorage.getItem('auth-token');
      if (!token) {
        setError('Authentication required. Please log in.');
        return;
      }

      const response = await fetch('/api/study/save-flashcards', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch flashcards');
      }

      const data = await response.json();
      if (data.success) {
        setFlashcards(data.data.flashcards || []);
      } else {
        throw new Error(data.error || 'Failed to fetch flashcards');
      }
    } catch (err: unknown) {
      console.error('Error fetching flashcards:', err);
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage || 'Failed to load flashcards. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [lastFetchTime]);

  // Memoized flashcard statistics calculation
  const calculatedStats = useMemo(() => {
    const total = flashcards.length;
    const saved = flashcards.filter(f => f.status === 'saved').length;
    const known = flashcards.filter(f => f.status === 'known').length;
    const review = flashcards.filter(f => f.status === 'review').length;
    const totalReviews = flashcards.reduce((acc, f) => acc + f.reviewCount, 0);
    const averageReviews = total > 0 ? Math.round((totalReviews / total) * 10) / 10 : 0;

    return {
      total,
      saved,
      known,
      review,
      totalReviews,
      averageReviews,
    };
  }, [flashcards]);

  // Update stats when calculated stats change
  useEffect(() => {
    setStats(calculatedStats);
  }, [calculatedStats]);

  // Memoized filtered flashcards to prevent unnecessary recalculations
  const memoizedFilteredFlashcards = useMemo(() => {
    let filtered = flashcards;

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(f => f.status === statusFilter);
    }

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(f => 
        f.question.toLowerCase().includes(query) ||
        f.answer.toLowerCase().includes(query) ||
        f.pdfTitle.toLowerCase().includes(query) ||
        (f.sourceText && f.sourceText.toLowerCase().includes(query))
      );
    }

    return filtered;
  }, [flashcards, searchQuery, statusFilter]);

  // Update filtered flashcards when memoized value changes
  useEffect(() => {
    setFilteredFlashcards(memoizedFilteredFlashcards);
  }, [memoizedFilteredFlashcards]);

  // Initial load - only run once on mount
  useEffect(() => {
    fetchFlashcards();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty dependency array to run only once

  // Update flashcard status
  const updateFlashcardStatus = async (flashcardId: string, newStatus: CardAction) => {
    try {
      const token = localStorage.getItem('auth-token');
      if (!token) {
        setError('Authentication required. Please log in.');
        return;
      }

      // Optimistically update the UI
      setFlashcards(prev => prev.map(f => 
        f._id?.toString() === flashcardId 
          ? { ...f, status: newStatus, lastReviewed: new Date(), reviewCount: f.reviewCount + 1 }
          : f
      ));

      const response = await fetch('/api/study/save-flashcards', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          flashcardId,
          status: newStatus,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update flashcard status');
      }

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || 'Failed to update flashcard status');
      }
    } catch (err: unknown) {
      console.error('Error updating flashcard status:', err);
      setError('Failed to update flashcard status. Please try again.');
      // Revert the optimistic update
      fetchFlashcards();
    }
  };

  // Delete flashcards
  const deleteFlashcards = async (flashcardIds: string[]) => {
    try {
      const token = localStorage.getItem('auth-token');
      if (!token) {
        setError('Authentication required. Please log in.');
        return;
      }

      // Optimistically update the UI
      setFlashcards(prev => prev.filter(f => !flashcardIds.includes(f._id?.toString() || '')));

      const response = await fetch('/api/study/save-flashcards', {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          flashcardIds,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete flashcards');
      }

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || 'Failed to delete flashcards');
      }
    } catch (err: unknown) {
      console.error('Error deleting flashcards:', err);
      setError('Failed to delete flashcards. Please try again.');
      // Revert the optimistic update
      fetchFlashcards();
    }
  };

  // Start review mode with filtered flashcards
  const startReview = () => {
    if (filteredFlashcards.length > 0) {
      setIsReviewMode(true);
    }
  };

  // Memoized conversion function to prevent unnecessary recalculations
  const convertToFlashcardFormat = useCallback((savedFlashcards: SavedFlashcard[]) => {
    return savedFlashcards.map(sf => ({
      id: sf._id?.toString() || '',
      front: sf.question,
      back: sf.answer,
      pageNumber: sf.pageNumber,
      sourceText: sf.sourceText,
      confidence: 1, // Default confidence for saved flashcards
      createdAt: sf.createdAt,
    }));
  }, []);



  // Exit review mode
  const exitReviewMode = () => {
    setIsReviewMode(false);
    fetchFlashcards(); // Refresh data after review
  };

  // Memoized status badge component
  const StatusBadge = useMemo(() => {
    const BadgeComponent = ({ status }: { status: CardAction }) => {
      const variants = {
        saved: 'default',
        known: 'secondary',
        review: 'destructive',
      } as const;

      return (
        <Badge variant={variants[status]} className="capitalize">
          {status}
        </Badge>
      );
    };
    return memo(BadgeComponent);
  }, []);

  if (isReviewMode && filteredFlashcards.length > 0) {
    return (
      <div className={className}>
        <FlashcardViewer
          flashcards={convertToFlashcardFormat(filteredFlashcards)}
          taskId="review-session"
          pdfTitle="Saved Flashcards Review"
          onBackToPdf={exitReviewMode}
        />
      </div>
    );
  }

  return (
    <div className={className}>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                Saved Flashcards
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Review and manage your saved flashcards
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={fetchFlashcards}
                disabled={isLoading}
              >
                <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              {filteredFlashcards.length > 0 && (
                <Button
                  onClick={startReview}
                  size="sm"
                  className="flex items-center gap-2"
                >
                  <Eye className="h-4 w-4" />
                  Review ({filteredFlashcards.length})
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert className="mb-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Statistics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold">{stats.total}</div>
                <p className="text-xs text-muted-foreground">Total Cards</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-blue-600">{stats.saved}</div>
                <p className="text-xs text-muted-foreground">Saved</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-green-600">{stats.known}</div>
                <p className="text-xs text-muted-foreground">Known</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-orange-600">{stats.review}</div>
                <p className="text-xs text-muted-foreground">Review</p>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search flashcards..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as CardAction | 'all')}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="saved">Saved</SelectItem>
                <SelectItem value="known">Known</SelectItem>
                <SelectItem value="review">Review</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Flashcards List */}
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <Card key={i}>
                  <CardContent className="p-4">
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-1/2" />
                      <Skeleton className="h-6 w-20" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : filteredFlashcards.length > 0 ? (
            <div className="space-y-4">
              {filteredFlashcards.map((flashcard) => (
                <Card key={flashcard._id?.toString()} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 space-y-2">
                        <div className="font-medium text-sm">
                          Q: {flashcard.question}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          A: {flashcard.answer}
                        </div>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span>{flashcard.pdfTitle}</span>
                          {flashcard.pageNumber && (
                            <span>Page {flashcard.pageNumber}</span>
                          )}
                          <span>Reviewed {flashcard.reviewCount} times</span>
                          {flashcard.lastReviewed && (
                            <span>Last: {new Date(flashcard.lastReviewed).toLocaleDateString()}</span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 ml-4">
                        <StatusBadge status={flashcard.status} />
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedFlashcard(flashcard)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteFlashcards([flashcard._id?.toString() || ''])}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No flashcards found</h3>
              <p className="text-muted-foreground mb-4">
                {searchQuery || statusFilter !== 'all' 
                  ? 'Try adjusting your search or filter criteria.'
                  : 'Start creating flashcards from your study sessions to see them here.'
                }
              </p>
              {(searchQuery || statusFilter !== 'all') && (
                <Button
                  variant="outline"
                  onClick={() => {
                    setSearchQuery('');
                    setStatusFilter('all');
                  }}
                >
                  Clear Filters
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Individual Flashcard Modal/Dialog could be added here */}
      {selectedFlashcard && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Flashcard Preview
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedFlashcard(null)}
                >
                  ×
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <div className="font-medium text-sm mb-2">Question:</div>
                  <div className="text-sm">{selectedFlashcard.question}</div>
                </div>
                <div>
                  <div className="font-medium text-sm mb-2">Answer:</div>
                  <div className="text-sm">{selectedFlashcard.answer}</div>
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <StatusBadge status={selectedFlashcard.status} />
                  <span>Reviewed {selectedFlashcard.reviewCount} times</span>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      updateFlashcardStatus(selectedFlashcard._id?.toString() || '', 'saved');
                      setSelectedFlashcard(null);
                    }}
                  >
                    Save
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      updateFlashcardStatus(selectedFlashcard._id?.toString() || '', 'known');
                      setSelectedFlashcard(null);
                    }}
                  >
                    Known
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      updateFlashcardStatus(selectedFlashcard._id?.toString() || '', 'review');
                      setSelectedFlashcard(null);
                    }}
                  >
                    Review Later
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

// Export memoized component to prevent unnecessary re-renders
export const SavedFlashcardsViewer = memo(SavedFlashcardsViewerComponent);