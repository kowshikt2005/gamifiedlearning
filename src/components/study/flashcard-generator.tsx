'use client';

import { useState, useCallback, useEffect, useMemo, memo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Zap, AlertTriangle, CheckCircle, ArrowLeft, Sparkles } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useStudySession } from '@/contexts/study-session-context';
import { useAuth } from '@/contexts/auth-context';
import { Flashcard, FlashcardGenerationRequest } from '@/lib/models/flashcard';

interface FlashcardGeneratorProps {
  taskId: string;
  onToggleView: () => void;
  onFlashcardsGenerated: (flashcards: Flashcard[]) => void;
}

type GenerationStatus = 'idle' | 'generating' | 'success' | 'error';

interface GenerationState {
  status: GenerationStatus;
  progress: number;
  message: string;
  error?: string;
}

const FlashcardGeneratorComponent = ({
  taskId,
  onToggleView,
  onFlashcardsGenerated
}: FlashcardGeneratorProps) => {
  const { toast } = useToast();
  const { taskInfo } = useStudySession();
  const { getValidToken } = useAuth();
  const [generationState, setGenerationState] = useState<GenerationState>({
    status: 'idle',
    progress: 0,
    message: 'Ready to generate flashcards from your PDF'
  });

  // Memoized progress updater to prevent unnecessary re-renders
  const updateProgress = useCallback((progress: number, message: string) => {
    setGenerationState(prev => ({
      ...prev,
      progress,
      message
    }));
  }, []);

  // Memoized validation of PDF data
  const pdfValidation = useMemo(() => {
    if (!taskInfo?.dataUri) {
      return { isValid: false, error: 'No PDF data available. Please ensure a PDF is loaded in the Study Space.' };
    }

    const pdfDataUri = taskInfo.dataUri;
    if (!pdfDataUri.startsWith('data:application/pdf;base64,')) {
      return { isValid: false, error: 'Invalid PDF data. Please ensure a valid PDF is loaded.' };
    }

    const base64Data = pdfDataUri.split(',')[1];
    if (!base64Data || base64Data.length < 1000) {
      return { isValid: false, error: 'PDF content appears to be too small or empty. Please ensure the PDF contains readable text.' };
    }

    return { isValid: true, error: null };
  }, [taskInfo?.dataUri]);

  // Optimized flashcard generation with memoized dependencies
  const generateFlashcards = useCallback(async () => {
    try {
      setGenerationState({
        status: 'generating',
        progress: 0,
        message: 'Preparing to generate flashcards...'
      });

      // Use memoized validation
      if (!pdfValidation.isValid) {
        throw new Error(pdfValidation.error || 'Invalid PDF data');
      }

      if (!taskInfo?.dataUri || !taskInfo?.name) {
        throw new Error('Task information is incomplete');
      }
      
      const pdfDataUri = taskInfo.dataUri;
      const pdfTitle = taskInfo.name;

      updateProgress(10, 'Analyzing PDF content...');

      // Get auth token using the auth context
      const token = getValidToken();
      if (!token) {
        throw new Error('Authentication required. Please log in again.');
      }

      updateProgress(25, 'Connecting to AI service...');

      // Prepare request data
      const requestData: FlashcardGenerationRequest = {
        pdfDataUri,
        pdfTitle,
        taskId,
        maxCards: 10
      };

      updateProgress(40, 'Processing document with AI...');

      // Make API request without timeout to allow AI processing to complete
      const response = await fetch('/api/study/generate-flashcards', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(requestData)
      });
      updateProgress(70, 'Generating flashcards...');

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to generate flashcards');
      }

      updateProgress(90, 'Finalizing flashcards...');

      if (!result.success || !result.data?.flashcards) {
        throw new Error('No flashcards were generated from this document');
      }

      const flashcardCount = result.data.flashcards.length;
      const processingTime = result.data.processingTime || 0;

      updateProgress(100, `Successfully generated ${flashcardCount} flashcards!`);

      setGenerationState({
        status: 'success',
        progress: 100,
        message: `Generated ${flashcardCount} flashcards in ${(processingTime / 1000).toFixed(1)}s`
      });

      // Show success toast
      toast({
        title: "Flashcards Generated! ✨",
        description: `Created ${flashcardCount} flashcards from your PDF`,
        className: "animate-levelUp"
      });

      // Pass flashcards to parent component
      onFlashcardsGenerated(result.data.flashcards);

    } catch (error: unknown) {
      console.error('Flashcard generation error:', error);

      let errorMessage = 'Failed to generate flashcards. Please try again.';
      
      // Handle specific error types with user-friendly messages
      if (error instanceof Error) {
        if (error.message?.includes('Authentication')) {
          errorMessage = 'Please log in again to continue.';
        } else if (error.message?.includes('quota') || error.message?.includes('rate limit')) {
          errorMessage = 'AI service is busy. Please try again in a few minutes.';
        } else if (error.message?.includes('No flashcards') || error.message?.includes('No valid flashcards')) {
          errorMessage = 'Unable to generate flashcards from this document. Please ensure the PDF contains readable text.';
        } else if (error.message?.includes('too small') || error.message?.includes('empty')) {
          errorMessage = 'PDF content is insufficient for flashcard generation. Please use a document with more text content.';
        } else {
          errorMessage = error.message;
        }
      }

      setGenerationState({
        status: 'error',
        progress: 0,
        message: 'Generation failed',
        error: errorMessage
      });

      toast({
        variant: 'destructive',
        title: 'Generation Failed',
        description: errorMessage,
      });
    }
  }, [pdfValidation, taskInfo, taskId, updateProgress, toast, onFlashcardsGenerated, getValidToken]);

  // Optimized keyboard support with cleanup
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Escape key to go back to PDF view
      if (event.key === 'Escape') {
        onToggleView();
      }
      // Enter key to generate flashcards when idle
      if (event.key === 'Enter' && generationState.status === 'idle') {
        generateFlashcards();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [generationState.status, onToggleView, generateFlashcards]);

  // Memoized reset function
  const resetGenerator = useCallback(() => {
    setGenerationState({
      status: 'idle',
      progress: 0,
      message: 'Ready to generate flashcards from your PDF'
    });
  }, []);

  // Memoized status icon to prevent unnecessary re-renders
  const statusIcon = useMemo(() => {
    switch (generationState.status) {
      case 'generating':
        return <Loader2 className="h-5 w-5 animate-spin text-primary" />;
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'error':
        return <AlertTriangle className="h-5 w-5 text-destructive" />;
      default:
        return <Sparkles className="h-5 w-5 text-primary" />;
    }
  }, [generationState.status]);

  // Memoized status color
  const statusColor = useMemo(() => {
    switch (generationState.status) {
      case 'generating':
        return 'text-primary';
      case 'success':
        return 'text-green-600';
      case 'error':
        return 'text-destructive';
      default:
        return 'text-muted-foreground';
    }
  }, [generationState.status]);

  // Early return if no task info is available
  if (!taskInfo) {
    return (
      <Card className="h-full flex flex-col" role="main" aria-label="Flashcard Generator">
        <CardHeader className="flex flex-row items-center justify-between pb-4 bg-gradient-to-r from-primary/10 to-accent/10">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            AI Flashcard Generator
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={onToggleView}
            className="flex items-center gap-2 hover:bg-background/80 transition-colors"
            aria-label="Switch back to PDF view"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to PDF
          </Button>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col justify-center items-center gap-4 p-6">
          <div className="text-center space-y-4">
            <div className="flex justify-center">
              <div className="p-3 rounded-full bg-muted">
                <AlertTriangle className="h-5 w-5 text-muted-foreground" />
              </div>
            </div>
            <div className="space-y-2">
              <p className="font-medium text-lg text-muted-foreground">
                No PDF Available
              </p>
              <p className="text-sm text-muted-foreground">
                Please load a PDF document in the Study Space to generate flashcards.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card 
      className="h-full flex flex-col" 
      role="main" 
      aria-label="Flashcard Generator"
    >
      <CardHeader className="flex flex-row items-center justify-between pb-4 bg-gradient-to-r from-primary/10 to-accent/10">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <Zap className="h-5 w-5 text-primary" />
          AI Flashcard Generator
        </CardTitle>
        <Button
          variant="outline"
          size="sm"
          onClick={onToggleView}
          className="flex items-center gap-2 hover:bg-background/80 transition-colors"
          aria-label="Switch back to PDF view"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to PDF
        </Button>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col gap-6 p-6">
        {/* Document Info */}
        <div className="bg-muted/50 rounded-lg p-4">
          <h3 className="font-medium text-sm text-muted-foreground mb-1">Document</h3>
          <p className="font-semibold truncate">{taskInfo?.name || 'Loading...'}</p>
        </div>

        {/* Generation Status */}
        <div className="flex-1 flex flex-col justify-center gap-6">
          <div className="text-center space-y-4">
            <div className="flex justify-center">
              <div className={`p-3 rounded-full ${
                generationState.status === 'generating' ? 'bg-primary/10' :
                generationState.status === 'success' ? 'bg-green-100 dark:bg-green-900/20' :
                generationState.status === 'error' ? 'bg-destructive/10' :
                'bg-muted'
              }`}>
                {statusIcon}
              </div>
            </div>
            
            <div className="space-y-3">
              <p className={`font-medium text-lg ${statusColor}`}>
                {generationState.message}
              </p>
              
              {generationState.status === 'generating' && (
                <div className="space-y-3">
                  <Progress 
                    value={generationState.progress} 
                    className="w-full h-2" 
                  />
                  <div className="flex justify-between items-center text-sm text-muted-foreground">
                    <span>{generationState.progress}% complete</span>
                    <span>~{Math.max(1, Math.ceil((100 - generationState.progress) / 10))}s remaining</span>
                  </div>
                </div>
              )}

              {generationState.status === 'success' && (
                <p className="text-sm text-muted-foreground">
                  Your flashcards are ready for review and study!
                </p>
              )}
            </div>
          </div>

          {/* Error Alert */}
          {generationState.status === 'error' && generationState.error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                {generationState.error}
              </AlertDescription>
            </Alert>
          )}

          {/* Success Message */}
          {generationState.status === 'success' && (
            <Alert className="border-green-200 bg-green-50 dark:bg-green-950/20">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800 dark:text-green-200">
                Flashcards are ready! You can now review and interact with them.
              </AlertDescription>
            </Alert>
          )}
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          {generationState.status === 'idle' && (
            <div className="space-y-2">
              <Button
                onClick={generateFlashcards}
                className="w-full h-12 text-base font-semibold bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 transition-all duration-200"
                size="lg"
              >
                <Sparkles className="h-5 w-5 mr-2" />
                Generate Flashcards
              </Button>
              <p className="text-xs text-center text-muted-foreground">
                This will create 5-10 flashcards from your PDF content
              </p>
            </div>
          )}

          {generationState.status === 'generating' && (
            <div className="space-y-2">
              <Button
                disabled
                className="w-full h-12 text-base cursor-not-allowed"
                size="lg"
              >
                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                Generating...
              </Button>
              <p className="text-xs text-center text-muted-foreground">
                Please wait while AI analyzes your document
              </p>
            </div>
          )}

          {generationState.status === 'error' && (
            <div className="space-y-2">
              <Button
                onClick={generateFlashcards}
                className="w-full h-12 text-base font-semibold"
                size="lg"
              >
                <Sparkles className="h-5 w-5 mr-2" />
                Try Again
              </Button>
              <Button
                variant="outline"
                onClick={resetGenerator}
                className="w-full"
              >
                Reset Generator
              </Button>
              <p className="text-xs text-center text-muted-foreground">
                Check your connection and try again
              </p>
            </div>
          )}

          {generationState.status === 'success' && (
            <div className="space-y-2">
              <Button
                variant="outline"
                onClick={resetGenerator}
                className="w-full"
              >
                Generate New Flashcards
              </Button>

            </div>
          )}
        </div>

        {/* Help Text */}
        <div className="text-center text-sm text-muted-foreground space-y-1">
          <p>AI will analyze your PDF and create 5-10 concise flashcards</p>
          <p>focusing on key concepts and important information.</p>
          <p className="text-xs mt-2">
            Press <kbd className="px-1 py-0.5 bg-muted rounded text-xs">Escape</kbd> to return to PDF view
          </p>
        </div>

        {/* Screen reader announcements */}
        <div 
          aria-live="polite" 
          aria-atomic="true" 
          className="sr-only"
        >
          {generationState.status === 'generating' && 
            `Generating flashcards: ${generationState.progress}% complete. ${generationState.message}`
          }
          {generationState.status === 'success' && generationState.message}
          {generationState.status === 'error' && `Error: ${generationState.error}`}
        </div>
      </CardContent>
    </Card>
  );
};

// Export memoized component to prevent unnecessary re-renders
export const FlashcardGenerator = memo(FlashcardGeneratorComponent);