'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Clock, Play, Pause, Square, RotateCcw, Timer, Zap } from 'lucide-react';
import { useStudySession } from '@/contexts/study-session-context';
// import { useGamification } from '@/contexts/gamification-context';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/auth-context';

interface IntegratedTimerProps {
    onComplete?: (elapsedSeconds: number) => void;
    onEarlyFinish?: () => void;
}

export function IntegratedTimer({ onComplete, onEarlyFinish }: IntegratedTimerProps) {
    const { user } = useAuth();
    const { taskInfo, studyDuration, setStudyDuration } = useStudySession();
    // const gamification = useGamification(); // Will be used for future gamification features
    const { toast } = useToast();
    
    // Timer state
    const [timeRemaining, setTimeRemaining] = useState(studyDuration);
    const [isActive, setIsActive] = useState(false);
    const [isPaused, setIsPaused] = useState(false);
    const [elapsedTime, setElapsedTime] = useState(0);
    const [, setSessionStartTime] = useState<Date | null>(null);
    
    // Refs for cleanup
    const intervalRef = useRef<NodeJS.Timeout | null>(null);
    const startTimeRef = useRef<number>(0);

    // Sync with context duration changes
    useEffect(() => {
        if (!isActive && !isPaused) {
            setTimeRemaining(studyDuration);
            setElapsedTime(0);
        }
    }, [studyDuration, isActive, isPaused]);

    // Handle timer completion
    const handleTimerComplete = useCallback(async () => {
        // First update local state
        setIsActive(false);
        setIsPaused(false);
        
        const minutesStudied = Math.floor(studyDuration / 60);
        const pointsEarned = minutesStudied * 2; // 2 points per minute
        
        // Use setTimeout to ensure state updates happen after render
        setTimeout(() => {
            // Gamification is now handled automatically through study session processing
            
            toast({
                title: "Study Session Complete! 🎉",
                description: `You studied for ${minutesStudied} minutes and earned ${pointsEarned} points!`,
            });
        }, 0);
        
        // Save session to database
        if (user && taskInfo) {
            try {
                const token = localStorage.getItem('auth-token');
                if (token) {
                    const sessionData = {
                        id: `study_${Date.now()}`,
                        taskName: taskInfo.name,
                        duration: minutesStudied,
                        score: 100, // Full completion score
                        points: pointsEarned,
                    };

                    const response = await fetch('/api/user/study-session', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}`,
                        },
                        body: JSON.stringify(sessionData),
                    });

                    if (response.ok) {
                        // Study session saved successfully
                    }
                }
            } catch (error) {
                console.error('Error saving study session:', error);
            }
        }
        
        // Call completion callback after a delay to ensure all state updates are done
        setTimeout(() => {
            if (onComplete) {
                onComplete(studyDuration);
            }
        }, 500);
    }, [studyDuration, user, taskInfo, toast, onComplete]);

    // Main timer logic
    useEffect(() => {
        if (isActive && timeRemaining > 0) {
            intervalRef.current = setInterval(() => {
                setTimeRemaining(prev => {
                    const newTime = prev - 1;
                    setElapsedTime(studyDuration - newTime);
                    return newTime;
                });
            }, 1000);
        } else {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
        }

        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
        };
    }, [isActive, timeRemaining, studyDuration]);

    // Handle timer completion in separate effect
    useEffect(() => {
        if (isActive && timeRemaining === 0) {
            // Use setTimeout to move completion logic outside of render cycle
            const timeoutId = setTimeout(() => {
                handleTimerComplete();
            }, 100);
            
            return () => clearTimeout(timeoutId);
        }
    }, [isActive, timeRemaining, handleTimerComplete]);

    // Start timer
    const handleStart = useCallback(() => {
        if (!isActive && !isPaused) {
            setIsActive(true);
            setIsPaused(false);
            setSessionStartTime(new Date());
            startTimeRef.current = Date.now();
            
            toast({
                title: "Study Session Started! 📚",
                description: "Focus mode activated. Good luck!",
            });
        }
    }, [isActive, isPaused, toast]);

    // Pause timer
    const handlePause = useCallback(() => {
        if (isActive) {
            setIsActive(false);
            setIsPaused(true);
            
            toast({
                title: "Study Session Paused ⏸️",
                description: "Take a break! Click resume to continue.",
            });
        }
    }, [isActive, toast]);

    // Resume timer
    const handleResume = useCallback(() => {
        if (isPaused) {
            setIsActive(true);
            setIsPaused(false);
            
            toast({
                title: "Study Session Resumed ▶️",
                description: "Back to studying! Keep up the great work!",
            });
        }
    }, [isPaused, toast]);

    // Stop timer early
    const handleStop = useCallback(async () => {
        if (isActive || isPaused) {
            setIsActive(false);
            setIsPaused(false);
            
            const minutesStudied = Math.floor(elapsedTime / 60);
            const partialPoints = Math.floor(minutesStudied * 1.5); // 1.5 points per minute for early finish
            
            if (minutesStudied > 0) {
                // Gamification is handled automatically through study session processing
                
                // Save partial session to database
                if (user && taskInfo) {
                    try {
                        const token = localStorage.getItem('auth-token');
                        if (token) {
                            const sessionData = {
                                id: `study_partial_${Date.now()}`,
                                taskName: `${taskInfo.name} (Early End)`,
                                duration: minutesStudied,
                                score: Math.floor((elapsedTime / studyDuration) * 100),
                                points: partialPoints,
                            };

                            const response = await fetch('/api/user/study-session', {
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'application/json',
                                    'Authorization': `Bearer ${token}`,
                                },
                                body: JSON.stringify(sessionData),
                            });

                            if (response.ok) {
                                // Partial study session saved successfully
                            }
                        }
                    } catch (error) {
                        console.error('Error saving partial study session:', error);
                    }
                }
                
                toast({
                    title: "Study Session Ended Early 🛑",
                    description: `You studied for ${minutesStudied} minutes and earned ${partialPoints} points!`,
                });
            }
            
            if (onEarlyFinish) {
                onEarlyFinish();
            }
        }
    }, [isActive, isPaused, elapsedTime, studyDuration, user, taskInfo, toast, onEarlyFinish]);

    // Reset timer
    const handleReset = useCallback(() => {
        setIsActive(false);
        setIsPaused(false);
        setTimeRemaining(studyDuration);
        setElapsedTime(0);
        setSessionStartTime(null);
        startTimeRef.current = 0;
        
        toast({
            title: "Timer Reset 🔄",
            description: "Timer has been reset to the original duration.",
        });
    }, [studyDuration, toast]);

    // Change duration
    const handleDurationChange = useCallback((minutes: number) => {
        if (!isActive && !isPaused) {
            const newDuration = minutes * 60;
            setStudyDuration(newDuration);
            setTimeRemaining(newDuration);
            setElapsedTime(0);
        }
    }, [isActive, isPaused, setStudyDuration]);

    // Format time display
    const formatTime = (seconds: number) => {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        
        if (hours > 0) {
            return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        }
        return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    // Calculate progress percentage
    const progressPercentage = ((studyDuration - timeRemaining) / studyDuration) * 100;

    // Get timer color based on progress
    const getTimerColor = () => {
        if (progressPercentage < 25) return 'text-green-600 dark:text-green-400';
        if (progressPercentage < 50) return 'text-blue-600 dark:text-blue-400';
        if (progressPercentage < 75) return 'text-yellow-600 dark:text-yellow-400';
        return 'text-red-600 dark:text-red-400';
    };

    return (
        <Card className="w-full h-full flex flex-col">
            <CardHeader className="flex flex-row items-center justify-between pb-4">
                <CardTitle className="text-xl font-semibold flex items-center gap-2">
                    <Timer className="h-5 w-5 text-primary" />
                    Study Timer
                </CardTitle>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    <span>{taskInfo?.name || 'Study Session'}</span>
                </div>
            </CardHeader>
            
            <CardContent className="flex-1 flex flex-col gap-6">
                {/* Timer Display */}
                <div className="text-center space-y-4">
                    <div className={`text-6xl font-bold font-mono ${getTimerColor()}`}>
                        {formatTime(timeRemaining)}
                    </div>
                    
                    {elapsedTime > 0 && (
                        <div className="text-sm text-muted-foreground">
                            Elapsed: {formatTime(elapsedTime)}
                        </div>
                    )}
                    
                    {/* Progress Bar */}
                    <div className="space-y-2">
                        <Progress value={progressPercentage} className="h-3" />
                        <div className="text-xs text-muted-foreground">
                            {progressPercentage.toFixed(1)}% Complete
                        </div>
                    </div>
                </div>

                {/* Control Buttons */}
                <div className="flex justify-center gap-3 flex-wrap">
                    {!isActive && !isPaused && (
                        <Button 
                            onClick={handleStart}
                            size="lg"
                            className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
                        >
                            <Play className="h-5 w-5" />
                            Start
                        </Button>
                    )}
                    
                    {isActive && (
                        <Button 
                            onClick={handlePause}
                            size="lg"
                            variant="outline"
                            className="flex items-center gap-2"
                        >
                            <Pause className="h-5 w-5" />
                            Pause
                        </Button>
                    )}
                    
                    {isPaused && (
                        <Button 
                            onClick={handleResume}
                            size="lg"
                            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700"
                        >
                            <Play className="h-5 w-5" />
                            Resume
                        </Button>
                    )}
                    
                    {(isActive || isPaused) && (
                        <Button 
                            onClick={handleStop}
                            size="lg"
                            variant="destructive"
                            className="flex items-center gap-2"
                        >
                            <Square className="h-5 w-5" />
                            Stop
                        </Button>
                    )}
                    
                    <Button 
                        onClick={handleReset}
                        size="lg"
                        variant="ghost"
                        className="flex items-center gap-2"
                        disabled={isActive}
                    >
                        <RotateCcw className="h-5 w-5" />
                        Reset
                    </Button>
                </div>

                {/* Duration Settings */}
                <div className="space-y-3">
                    <label className="text-sm font-medium">Duration (minutes)</label>
                    <div className="grid grid-cols-3 gap-2">
                        {[15, 25, 30, 45, 60, 90].map(minutes => (
                            <Button
                                key={minutes}
                                variant={studyDuration === minutes * 60 ? "default" : "outline"}
                                size="sm"
                                onClick={() => handleDurationChange(minutes)}
                                disabled={isActive || isPaused}
                                className="text-xs"
                            >
                                {minutes}m
                            </Button>
                        ))}
                    </div>
                </div>

                {/* Status Display */}
                <div className="text-center p-3 bg-muted/50 rounded-lg">
                    <div className="flex items-center justify-center gap-2 text-sm">
                        {isActive && (
                            <>
                                <Zap className="h-4 w-4 text-green-500 animate-pulse" />
                                <span className="text-green-700 dark:text-green-300 font-medium">
                                    Study session in progress...
                                </span>
                            </>
                        )}
                        {isPaused && (
                            <>
                                <Pause className="h-4 w-4 text-yellow-500" />
                                <span className="text-yellow-700 dark:text-yellow-300 font-medium">
                                    Study session paused
                                </span>
                            </>
                        )}
                        {!isActive && !isPaused && (
                            <>
                                <Clock className="h-4 w-4 text-blue-500" />
                                <span className="text-blue-700 dark:text-blue-300 font-medium">
                                    Ready to start studying
                                </span>
                            </>
                        )}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}