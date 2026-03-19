'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useStudySession } from '@/contexts/study-session-context';
import { useGamification } from '@/contexts/gamification-context';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, BookOpen, Zap, Star, Target, Trophy, Flame, Maximize2, Minimize2, MessageSquare, Timer, Sparkles } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { PersistentTimer } from '@/components/study/persistent-timer';
import { Button } from '@/components/ui/button';
import { PowerUpActivator } from '@/components/gamification/power-up-activator';


// Import AI chat directly instead of lazy loading to avoid visibility issues
import { AIChat } from '@/components/study/ai-chat';
import { FlashcardGenerator } from '@/components/study/flashcard-generator';
import { FlashcardViewer } from '@/components/study/flashcard-viewer';
import { Flashcard } from '@/lib/models/flashcard';

export default function StudySessionPage() {
    const router = useRouter();
    const params = useParams();
    const { taskInfo, setTaskInfo, studyDuration, setStudyDuration, addPenalty, timerState } = useStudySession();
    const { points, level, streak } = useGamification();
    const { toast } = useToast();
    const [isClient, setIsClient] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [pdfWidth, setPdfWidth] = useState(60); // PDF takes 60% width initially
    const [activeTab, setActiveTab] = useState('timer'); // 'timer', 'chat', or 'flashcards'
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [currentView, setCurrentView] = useState<'pdf' | 'flashcard-generator' | 'flashcard-viewer'>('pdf');
    const [generatedFlashcards, setGeneratedFlashcards] = useState<Flashcard[]>([]);

    // All useCallback hooks must be defined before any conditional returns
    const handleSessionComplete = useCallback((duration: number) => {
        setStudyDuration(duration);
        // Gamification: Update daily progress
        
        toast({
            title: "Study Session Complete! 🎉",
            description: "Great job! Let's test your knowledge with a quiz...",
            className: "animate-levelUp"
        });
        router.push(`/dashboard/session/${params.sessionId}/quiz`);
    }, [setStudyDuration, router, params.sessionId, toast]);

    const handleEarlyFinish = useCallback(() => {
        addPenalty(25); // 25 point penalty for ending session early
        // Set actual elapsed time so results page shows correct study duration
        setStudyDuration(timerState.elapsedTime);
        toast({
            title: 'Session Ended Early',
            description: 'A 25 point penalty has been applied. Moving to quiz...',
            variant: 'destructive',
            className: "animate-shake"
        });
        router.push(`/dashboard/session/${params.sessionId}/quiz`);
    }, [addPenalty, setStudyDuration, timerState.elapsedTime, router, params.sessionId, toast]);

    const handleToggleView = useCallback(() => {
        if (currentView === 'pdf') {
            setCurrentView('flashcard-generator');
        } else {
            setCurrentView('pdf');
        }
    }, [currentView]);

    const handleFlashcardsGenerated = useCallback((flashcards: Flashcard[]) => {
        setGeneratedFlashcards(flashcards);
        setCurrentView('flashcard-viewer');
    }, []);

    // All useEffect hooks
    useEffect(() => {
        setIsClient(true);
        if (!taskInfo) {
            const storedData = sessionStorage.getItem(`session-${params.sessionId}`);
            if (storedData) {
                try {
                    const parsedData = JSON.parse(storedData);
                    // Support both formats: wrapped {taskInfo, studyDuration} and raw taskInfo
                    if (parsedData.taskInfo) {
                        setTaskInfo(parsedData.taskInfo);
                        if (parsedData.studyDuration) setStudyDuration(parsedData.studyDuration);
                    } else if (parsedData.name && parsedData.dataUri) {
                        // Raw taskInfo object stored directly
                        setTaskInfo(parsedData);
                    } else {
                        setError("Failed to load session data. Please start a new session.");
                    }
                } catch {
                    setError("Failed to load session data. Please start a new session.");
                }
            } else {
                // If there's no session data, redirect to create task
                setError("No session data found. Please start a new session.");
            }
        }
    }, [taskInfo, setTaskInfo, setStudyDuration, params.sessionId]);

    useEffect(() => {
        if(taskInfo){
            // Store in a consistent wrapped format so recovery reads both fields
            sessionStorage.setItem(`session-${params.sessionId}`, JSON.stringify({
                taskInfo,
                studyDuration,
            }));
        }
    }, [taskInfo, studyDuration, params.sessionId]);

    useEffect(() => {
        if(error) {
            toast({
                variant: 'destructive',
                title: 'Session Error',
                description: error,
            });
            router.replace('/dashboard/create-task');
        }
    }, [error, router, toast]);

    // Regular functions (not hooks)
    const toggleFullscreen = () => {
        setIsFullscreen(!isFullscreen);
        setPdfWidth(isFullscreen ? 60 : 95);
    };

    const adjustPdfWidth = (newWidth: number) => {
        setPdfWidth(Math.max(30, Math.min(95, newWidth)));
    };

    // Early returns after all hooks are defined
    if (!isClient) {
        return (
            <div className="flex h-[80vh] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if(!taskInfo){
        return (
            <div className="flex h-[80vh] items-center justify-center flex-col gap-4">
                <p className="text-muted-foreground">Session data not found. Please start a new session.</p>
                <Button onClick={() => router.push('/dashboard/create-task')}>Create New Session</Button>
            </div>
        );
    }



    return (
        <div className="flex flex-col h-[calc(100vh-8rem)] gap-4 animate-fadeIn">
            {/* Compact Gamification Header */}
            <div className="flex flex-wrap justify-between items-center p-3 bg-gradient-to-r from-primary/10 to-accent/10 rounded-xl gap-4">
                <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-2 bg-white dark:bg-black/20 px-3 py-1.5 rounded-full shadow-md">
                        <Target className="h-4 w-4 text-primary" />
                        <span className="font-bold text-sm">Study Session</span>
                    </div>
                    <div className="flex items-center gap-1 bg-white dark:bg-black/20 px-2 py-1 rounded-full shadow-md">
                        <Button
                            variant={currentView === 'pdf' ? 'default' : 'ghost'}
                            size="sm"
                            onClick={() => setCurrentView('pdf')}
                            className="h-7 px-3 text-xs rounded-full"
                        >
                            PDF
                        </Button>
                        <Button
                            variant={currentView !== 'pdf' ? 'default' : 'ghost'}
                            size="sm"
                            onClick={handleToggleView}
                            className="h-7 px-3 text-xs rounded-full"
                        >
                            <Sparkles className="h-3 w-3 mr-1" />
                            Flashcards
                        </Button>
                    </div>
                    <div className="flex items-center gap-2 bg-yellow-100 dark:bg-yellow-900/30 px-3 py-1.5 rounded-full">
                        <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                        <span className="font-bold text-sm">{points}</span>
                    </div>
                    <div className="flex items-center gap-2 bg-green-100 dark:bg-green-900/30 px-3 py-1.5 rounded-full">
                        <Flame className="h-4 w-4 text-red-500" />
                        <span className="font-bold text-sm">{streak}</span>
                    </div>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-2 bg-blue-100 dark:bg-blue-900/30 px-3 py-1.5 rounded-full">
                        <Trophy className="h-4 w-4 text-blue-500" />
                        <span className="font-bold text-sm">L{level}</span>
                    </div>
                    <PowerUpActivator />
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={toggleFullscreen}
                        className="rounded-full"
                    >
                        {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                    </Button>
                </div>
            </div>
            
            <div className="flex flex-1 gap-4 min-h-0">
                {/* PDF Viewer Section */}
                <div 
                    className="transition-all duration-300 rounded-xl group h-full"
                    style={{ width: `${pdfWidth}%` }}
                >
                    <Card className="h-full transition-all duration-300 group-hover:shadow-lg hover:shadow-xl gamify-card rounded-xl overflow-hidden border-2 border-primary/20">
                        <CardHeader className="flex flex-row items-center justify-between pb-2 bg-gradient-to-r from-primary/10 to-accent/10">
                            <CardTitle className="text-base font-medium flex items-center gap-2">
                                {currentView === 'pdf' ? (
                                    <>
                                        <BookOpen className="h-4 w-4 text-primary" />
                                        {taskInfo.name}
                                    </>
                                ) : currentView === 'flashcard-generator' ? (
                                    <>
                                        <Sparkles className="h-4 w-4 text-primary" />
                                        Generate Flashcards
                                    </>
                                ) : (
                                    <>
                                        <Zap className="h-4 w-4 text-primary" />
                                        Flashcard Study
                                    </>
                                )}
                            </CardTitle>
                            <div className="flex items-center gap-2">
                                <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse"></div>
                                <span className="text-xs text-muted-foreground">Active</span>
                                {currentView === 'pdf' && (
                                    <div className="flex gap-1">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => adjustPdfWidth(pdfWidth - 10)}
                                            className="h-6 w-6 p-0"
                                        >
                                            -
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => adjustPdfWidth(pdfWidth + 10)}
                                            className="h-6 w-6 p-0"
                                        >
                                            +
                                        </Button>
                                    </div>
                                )}
                            </div>
                        </CardHeader>
                        <CardContent className="h-full p-0 relative rounded-b-xl bg-gradient-to-b from-background to-muted/20">
                            {currentView === 'pdf' ? (
                                taskInfo.dataUri ? (
                                    <object 
                                        data={taskInfo.dataUri} 
                                        type="application/pdf" 
                                        className="h-full w-full rounded-b-xl"
                                    >
                                        <p className="p-4">PDF viewer is not available. You can download the PDF <a href={taskInfo.dataUri} download className="text-primary underline">here</a>.</p>
                                    </object>
                                ) : (
                                    <div className="flex items-center justify-center h-full">
                                        <p className="text-muted-foreground">Loading document...</p>
                                    </div>
                                )
                            ) : currentView === 'flashcard-generator' ? (
                                <div className="h-full p-4">
                                    <FlashcardGenerator
                                        taskId={params.sessionId as string}
                                        onToggleView={handleToggleView}
                                        onFlashcardsGenerated={handleFlashcardsGenerated}
                                    />
                                </div>
                            ) : (
                                <div className="h-full p-4">
                                    <FlashcardViewer
                                        flashcards={generatedFlashcards}
                                        taskId={params.sessionId as string}
                                        pdfTitle={taskInfo.name}
                                        onBackToPdf={handleToggleView}
                                    />
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
                
                {/* Right Panel - Timer and Chat */}
                <div className="flex flex-col gap-4 flex-1 min-w-0 h-full">
                    {/* Tab Navigation */}
                    <div className="flex space-x-1 bg-muted rounded-lg p-1">
                        <Button
                            variant={activeTab === 'timer' ? 'default' : 'ghost'}
                            className="flex-1 flex items-center gap-2"
                            onClick={() => setActiveTab('timer')}
                        >
                            <Timer className="h-4 w-4" />
                            Timer
                        </Button>
                        <Button
                            variant={activeTab === 'chat' ? 'default' : 'ghost'}
                            className="flex-1 flex items-center gap-2"
                            onClick={() => setActiveTab('chat')}
                        >
                            <MessageSquare className="h-4 w-4" />
                            AI Chat
                        </Button>
                    </div>
                    
                    {/* Content Area - Both components always mounted */}
                    <div className="flex-1 relative">
                        {/* Timer - Always mounted, visibility controlled by CSS */}
                        <div 
                            className={`absolute inset-0 transition-opacity duration-200 ${
                                activeTab === 'timer' ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'
                            }`}
                        >
                            <PersistentTimer 
                                onComplete={handleSessionComplete} 
                                onEarlyFinish={handleEarlyFinish}
                            />
                        </div>
                        
                        {/* AI Chat - Always mounted, visibility controlled by CSS */}
                        <div 
                            className={`absolute inset-0 transition-opacity duration-200 ${
                                activeTab === 'chat' ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'
                            }`}
                        >
                            <AIChat pdfDataUri={taskInfo.dataUri} />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}