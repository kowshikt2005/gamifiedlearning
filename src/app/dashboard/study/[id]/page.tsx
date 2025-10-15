'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useStudySession } from '@/contexts/study-session-context';
import { useGamification } from '@/contexts/gamification-context';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, BookOpen, Zap, Star, Target, Trophy, Flame, Maximize2, Minimize2, MessageSquare, Timer, FileText, Sparkles } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { IntegratedTimer } from '@/components/study/integrated-timer';
import { Button } from '@/components/ui/button';
import { PowerUpActivator } from '@/components/gamification/power-up-activator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FlashcardGenerator, FlashcardViewer, AIChat } from '@/components/study';
import { Flashcard } from '@/lib/models/flashcard';

export default function StudyPage() {
    const router = useRouter();
    const params = useParams();
    const { taskInfo, setTaskInfo, setStudyDuration, addPenalty } = useStudySession();
    const { points, level, streak, addPoints } = useGamification();
    const { toast } = useToast();
    const [isClient, setIsClient] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [pdfWidth, setPdfWidth] = useState(60); // PDF takes 60% width initially
    const [activeTab, setActiveTab] = useState('timer'); // 'timer' or 'chat'
    const [isFullscreen, setIsFullscreen] = useState(false);
    
    // Flashcard system state
    const [currentView, setCurrentView] = useState<'pdf' | 'flashcard-generator' | 'flashcard-viewer'>('pdf');
    const [generatedFlashcards, setGeneratedFlashcards] = useState<Flashcard[]>([]);

    useEffect(() => {
        setIsClient(true);
        if (!taskInfo) {
            const storedData = sessionStorage.getItem(`task-${params.id}`);
            if (storedData) {
                try {
                    const parsedData = JSON.parse(storedData);
                    setTaskInfo(parsedData.taskInfo);
                    setStudyDuration(parsedData.studyDuration);
                } catch {
                    setError("Failed to load session data. Please start a new task.");
                }
            } else {
                // If there's no session data, it could be a refresh.
                // We shouldn't immediately redirect, but let other components handle it
                // if they rely on taskInfo and it's not there.
            }
        }
    }, [params.id, setStudyDuration, setTaskInfo, taskInfo]);
    
    useEffect(() => {
        if(taskInfo){
            sessionStorage.setItem(`task-${params.id}`, JSON.stringify(taskInfo));
        }
    }, [taskInfo, params.id])

    useEffect(() => {
        if(error) {
            toast({
                variant: 'destructive',
                title: 'Error',
                description: error,
            });
            router.replace('/dashboard/create-task');
        }
    }, [error, router, toast]);
    
    const handleSessionComplete = useCallback((duration: number) => {
        setStudyDuration(duration);
        // Gamification: Update daily progress
        const minutesStudied = Math.floor(duration / 60);
        // Add points for studying (2 points per minute)
        addPoints(minutesStudied * 2);
        
        toast({
            title: "Time's up! 🎉",
            description: "Great job! Let's see what you've learned. Moving to the quiz...",
            className: "animate-levelUp"
        });
        router.push(`/dashboard/quiz/${params.id}`);
    }, [setStudyDuration, addPoints, router, params.id, toast]);

    const handleEarlyFinish = useCallback(() => {
        addPenalty(25); // 25 point penalty for ending session early
        toast({
            title: 'Session Ended Early ⚠️',
            description: 'A 25 point penalty has been applied. Moving to quiz...',
            variant: 'destructive',
            className: "animate-shake"
        });
        router.push(`/dashboard/quiz/${params.id}`);
    }, [addPenalty, router, params.id, toast]);

    // All hooks must be called before any early returns
    const toggleFullscreen = useCallback(() => {
        setIsFullscreen(!isFullscreen);
        setPdfWidth(isFullscreen ? 60 : 95);
    }, [isFullscreen]);

    const adjustPdfWidth = useCallback((newWidth: number) => {
        setPdfWidth(Math.max(30, Math.min(95, newWidth)));
    }, []);

    // Flashcard system handlers
    const handleToggleToFlashcardGenerator = useCallback(() => {
        setCurrentView('flashcard-generator');
    }, []);

    const handleToggleToPdf = useCallback(() => {
        setCurrentView('pdf');
    }, []);

    const handleFlashcardsGenerated = useCallback((flashcards: Flashcard[]) => {
        setGeneratedFlashcards(flashcards);
        setCurrentView('flashcard-viewer');
    }, []);

    const handleBackToGenerator = useCallback(() => {
        setCurrentView('flashcard-generator');
    }, []);

    // Early returns after all hooks
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
                <Button onClick={() => router.push('/dashboard/create-task')}>Create New Task</Button>
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
                    
                    {/* View Toggle Indicator */}
                    <div className="flex items-center gap-2 bg-white dark:bg-black/20 px-3 py-1.5 rounded-full shadow-md">
                        {currentView === 'pdf' && (
                            <>
                                <FileText className="h-4 w-4 text-blue-500" />
                                <span className="font-bold text-sm text-blue-600">PDF View</span>
                            </>
                        )}
                        {currentView === 'flashcard-generator' && (
                            <>
                                <Zap className="h-4 w-4 text-purple-500" />
                                <span className="font-bold text-sm text-purple-600">Generating</span>
                            </>
                        )}
                        {currentView === 'flashcard-viewer' && (
                            <>
                                <Sparkles className="h-4 w-4 text-green-500" />
                                <span className="font-bold text-sm text-green-600">Flashcards</span>
                            </>
                        )}
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
                    
                    {/* View Toggle Buttons */}
                    {currentView !== 'pdf' && (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleToggleToPdf}
                            className="flex items-center gap-2 rounded-full"
                            aria-label="Switch to PDF view"
                        >
                            <FileText className="h-4 w-4" />
                            <span className="hidden sm:inline">PDF</span>
                        </Button>
                    )}
                    
                    {currentView === 'pdf' && taskInfo.dataUri && (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleToggleToFlashcardGenerator}
                            className="flex items-center gap-2 rounded-full bg-gradient-to-r from-primary/10 to-accent/10 hover:from-primary/20 hover:to-accent/20"
                            aria-label="Generate flashcards"
                        >
                            <Sparkles className="h-4 w-4" />
                            <span className="hidden sm:inline">Flashcards</span>
                        </Button>
                    )}
                    
                    {currentView === 'flashcard-viewer' && generatedFlashcards.length > 0 && (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleBackToGenerator}
                            className="flex items-center gap-2 rounded-full"
                            aria-label="Back to flashcard generator"
                        >
                            <Zap className="h-4 w-4" />
                            <span className="hidden sm:inline">Generator</span>
                        </Button>
                    )}
                    
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
                {/* Main Content Area - PDF or Flashcard Views */}
                <div 
                    className="transition-all duration-300 rounded-xl group h-full"
                    style={{ width: currentView === 'flashcard-viewer' ? '100%' : `${pdfWidth}%` }}
                >
                    {currentView === 'pdf' && (
                        <Card className="h-full transition-all duration-300 group-hover:shadow-lg hover:shadow-xl gamify-card rounded-xl overflow-hidden border-2 border-primary/20">
                            <CardHeader className="flex flex-row items-center justify-between pb-2 bg-gradient-to-r from-primary/10 to-accent/10">
                                <CardTitle className="text-base font-medium flex items-center gap-2">
                                    <BookOpen className="h-4 w-4 text-primary" />
                                    {taskInfo.name}
                                </CardTitle>
                                <div className="flex items-center gap-2">
                                    <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse"></div>
                                    <span className="text-xs text-muted-foreground">Active</span>
                                    
                                    {/* Flashcard Generation Button */}
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={handleToggleToFlashcardGenerator}
                                        className="flex items-center gap-2 bg-gradient-to-r from-primary/10 to-accent/10 hover:from-primary/20 hover:to-accent/20 transition-all duration-200"
                                        aria-label="Generate flashcards from this PDF"
                                    >
                                        <Sparkles className="h-4 w-4" />
                                        <span className="hidden sm:inline">Generate Flashcards</span>
                                        <span className="sm:hidden">Cards</span>
                                    </Button>
                                    
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
                                </div>
                            </CardHeader>
                            <CardContent className="h-full p-0 relative rounded-b-xl bg-gradient-to-b from-background to-muted/20">
                                {taskInfo.dataUri ? (
                                    <div className="h-full w-full relative">
                                        <object 
                                            data={taskInfo.dataUri} 
                                            type="application/pdf" 
                                            className="h-full w-full rounded-b-xl"
                                        >
                                            <div className="flex flex-col items-center justify-center h-full p-8 space-y-4">
                                                <div className="text-center">
                                                    <h3 className="text-lg font-semibold mb-2">PDF Viewer Not Available</h3>
                                                    <p className="text-muted-foreground mb-4">
                                                        Your browser doesn't support embedded PDF viewing, but you can still use all study features.
                                                    </p>
                                                    <div className="space-y-2">
                                                        <Button asChild variant="outline">
                                                            <a href={taskInfo.dataUri} download={taskInfo.name} className="flex items-center gap-2">
                                                                📄 Download PDF
                                                            </a>
                                                        </Button>
                                                        <p className="text-sm text-muted-foreground">
                                                            You can still generate flashcards and use AI chat features!
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        </object>
                                        
                                        {/* PDF Loading Indicator */}
                                        <div className="absolute top-2 right-2 bg-green-100 dark:bg-green-900/30 px-2 py-1 rounded-full flex items-center gap-1">
                                            <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse"></div>
                                            <span className="text-xs text-green-700 dark:text-green-300">PDF Loaded</span>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center justify-center h-full space-y-4">
                                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                                        <p className="text-muted-foreground">Loading document...</p>
                                        <p className="text-sm text-muted-foreground">This may take a moment for large files</p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    )}

                    {currentView === 'flashcard-generator' && (
                        <FlashcardGenerator
                            taskId={params.id as string}
                            onToggleView={handleToggleToPdf}
                            onFlashcardsGenerated={handleFlashcardsGenerated}
                        />
                    )}

                    {currentView === 'flashcard-viewer' && (
                        <FlashcardViewer
                            flashcards={generatedFlashcards}
                            taskId={params.id as string}
                            pdfTitle={taskInfo.name}
                            onBackToPdf={handleToggleToPdf}
                        />
                    )}
                </div>
                
                {/* Right Panel - Timer and Chat (hidden in flashcard viewer mode) */}
                {currentView !== 'flashcard-viewer' && (
                    <div className="flex flex-col gap-4 flex-1 min-w-0 h-full">
                        <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
                            <TabsList className="grid w-full grid-cols-2">
                                <TabsTrigger value="timer" className="flex items-center gap-2">
                                    <Timer className="h-4 w-4" />
                                    Timer
                                </TabsTrigger>
                                <TabsTrigger value="chat" className="flex items-center gap-2">
                                    <MessageSquare className="h-4 w-4" />
                                    AI Chat
                                </TabsTrigger>
                            </TabsList>
                            
                            <TabsContent value="timer" className="flex-1 mt-4">
                                <div className="h-full">
                                    <IntegratedTimer 
                                        onComplete={handleSessionComplete} 
                                        onEarlyFinish={handleEarlyFinish}
                                    />
                                </div>
                            </TabsContent>
                            
                            <TabsContent value="chat" className="flex-1 mt-4">
                                <div className="h-full">
                                    <AIChat pdfDataUri={taskInfo.dataUri} />
                                </div>
                            </TabsContent>
                        </Tabs>
                    </div>
                )}
            </div>
        </div>
    );
}