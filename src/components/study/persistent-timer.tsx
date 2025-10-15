'use client';

import { useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Clock, Play, Pause, Square, RotateCcw, Timer, Zap } from 'lucide-react';
import { useStudySession } from '@/contexts/study-session-context';
import { useGamification } from '@/contexts/gamification-context';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/auth-context';

interface PersistentTimerProps {
    onComplete?: (elapsedSeconds: number) => void;
    onEarlyFinish?: () => void;
}

export function PersistentTimer({ onComplete, onEarlyFinish }: PersistentTimerProps) {
    const { user, getValidToken } = useAuth();
    const { taskInfo, studyDuration, setStudyDuration, timerState, updateTimerState, resetTimer } = useStudySession();
    const { addStudyTime, addPoints, incrementStreak, powerUps } = useGamification();
    const { toast } = useToast();

    // Handle timer completion
    useEffect(() => {
        if (timerState.isActive && timerState.timeRemaining === 0) {
            // Timer completed
            updateTimerState({
                isActive: false,
                isPaused: false,
            });
            
            const minutesStudied = Math.floor(studyDuration / 60);
            let pointsEarned = minutesStudied * 5; // NEW SYSTEM: 5 points per minute for completed session
            
            // Check for 2x power-up
            const doublePointsActive = powerUps.some(p => p.id === 'double-points' && p.active);
            if (doublePointsActive) {
                pointsEarned *= 2; // Apply 2x multiplier
            }
            
            // Use setTimeout to ensure state updates happen after render
            setTimeout(() => {
                // Update gamification in next tick
                addPoints(pointsEarned);
                addStudyTime(minutesStudied);
                incrementStreak();
                
                toast({
                    title: "Study Session Complete! 🎉",
                    description: `You studied for ${minutesStudied} minutes and earned ${pointsEarned} points!`,
                });
            }, 0);
            
            // Save session to database - but don't block completion flow
            if (user && taskInfo) {
                const saveSession = async () => {
                    try {
                        const token = getValidToken();
                        if (!token) {
                            console.warn('No valid auth token found, skipping database save');
                            return;
                        }

                        const sessionData = {
                            id: `study_${Date.now()}`,
                            taskName: taskInfo.name,
                            duration: minutesStudied,
                            score: 100, // Full completion score
                            points: pointsEarned,
                            quizAnswers: [] // Empty for timer completion
                        };

                        // Saving timer completion session

                        const response = await fetch('/api/user/study-session', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${token}`,
                            },
                            body: JSON.stringify(sessionData),
                        });

                        if (response.ok) {
                            await response.json();
                            // Timer session saved successfully
                        } else {
                            const errorData = await response.text();
                            console.error('Failed to save timer session:', response.status, errorData);
                        }
                    } catch (error) {
                        console.error('Error saving timer session:', error);
                    }
                };

                // Save in background
                saveSession();
            }
            
            // Call completion callback after a delay to ensure all state updates are done
            setTimeout(() => {
                if (onComplete) {
                    onComplete(studyDuration);
                }
            }, 500);
        }
    }, [timerState.isActive, timerState.timeRemaining, studyDuration, updateTimerState, addPoints, addStudyTime, incrementStreak, user, taskInfo, toast, onComplete, getValidToken, powerUps]);

    // Start timer
    const handleStart = useCallback(() => {
        if (!timerState.isActive && !timerState.isPaused) {
            updateTimerState({
                isActive: true,
                isPaused: false,
                sessionStartTime: new Date(),
            });
            
            toast({
                title: "Study Session Started! 📚",
                description: "Focus mode activated. Good luck!",
            });
        }
    }, [timerState.isActive, timerState.isPaused, updateTimerState, toast]);

    // Pause timer
    const handlePause = useCallback(() => {
        if (timerState.isActive) {
            updateTimerState({
                isActive: false,
                isPaused: true,
            });
            
            toast({
                title: "Study Session Paused ⏸️",
                description: "Take a break! Click resume to continue.",
            });
        }
    }, [timerState.isActive, updateTimerState, toast]);

    // Resume timer
    const handleResume = useCallback(() => {
        if (timerState.isPaused) {
            updateTimerState({
                isActive: true,
                isPaused: false,
            });
            
            toast({
                title: "Study Session Resumed ▶️",
                description: "Back to studying! Keep up the great work!",
            });
        }
    }, [timerState.isPaused, updateTimerState, toast]);

    // Stop timer early
    const handleStop = useCallback(async () => {
        if (timerState.isActive || timerState.isPaused) {
            updateTimerState({
                isActive: false,
                isPaused: false,
            });
            
            const minutesStudied = Math.floor(timerState.elapsedTime / 60);
            // NEW SYSTEM: Early end penalty of -25 points
            const partialPoints = -25;
            
            // Always apply penalty for early end, regardless of time studied
            addPoints(partialPoints);
            
            if (minutesStudied > 0) {
                // Still track study time even if ended early
                addStudyTime(minutesStudied);
                
                // Save partial session to database - but don't block UI
                if (user && taskInfo) {
                    const savePartialSession = async () => {
                        try {
                            const token = getValidToken();
                            if (!token) {
                                console.warn('No valid auth token found, skipping partial session save');
                                return;
                            }

                            const sessionData = {
                                id: `study_partial_${Date.now()}`,
                                taskName: `${taskInfo.name} (Early End)`,
                                duration: minutesStudied,
                                score: Math.floor((timerState.elapsedTime / studyDuration) * 100),
                                points: partialPoints,
                                quizAnswers: [] // Empty for early finish
                            };

                            // Saving partial session

                            const response = await fetch('/api/user/study-session', {
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'application/json',
                                    'Authorization': `Bearer ${token}`,
                                },
                                body: JSON.stringify(sessionData),
                            });

                            if (response.ok) {
                                await response.json();
                                // Partial session saved successfully
                            } else {
                                const errorData = await response.text();
                                console.error('Failed to save partial session:', response.status, errorData);
                            }
                        } catch (error) {
                            console.error('Error saving partial session:', error);
                        }
                    };

                    // Save in background
                    savePartialSession();
                }
                
                toast({
                    title: "Study Session Ended Early 🛑",
                    description: `You studied for ${minutesStudied} minutes but lost 25 points for ending early!`,
                    variant: "destructive",
                });
            }
            
            if (onEarlyFinish) {
                onEarlyFinish();
            }
        }
    }, [timerState.isActive, timerState.isPaused, timerState.elapsedTime, studyDuration, addPoints, addStudyTime, user, taskInfo, toast, onEarlyFinish, updateTimerState, getValidToken]);

    // Reset timer
    const handleReset = useCallback(() => {
        resetTimer();
        
        toast({
            title: "Timer Reset 🔄",
            description: "Timer has been reset to the original duration.",
        });
    }, [resetTimer, toast]);

    // Change duration
    const handleDurationChange = useCallback((minutes: number) => {
        if (!timerState.isActive && !timerState.isPaused) {
            const newDuration = minutes * 60;
            setStudyDuration(newDuration);
        }
    }, [timerState.isActive, timerState.isPaused, setStudyDuration]);

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
    const progressPercentage = ((studyDuration - timerState.timeRemaining) / studyDuration) * 100;

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
                        {formatTime(timerState.timeRemaining)}
                    </div>
                    
                    {timerState.elapsedTime > 0 && (
                        <div className="text-sm text-muted-foreground">
                            Elapsed: {formatTime(timerState.elapsedTime)}
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
                    {!timerState.isActive && !timerState.isPaused && (
                        <Button 
                            onClick={handleStart}
                            size="lg"
                            className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
                        >
                            <Play className="h-5 w-5" />
                            Start
                        </Button>
                    )}
                    
                    {timerState.isActive && (
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
                    
                    {timerState.isPaused && (
                        <Button 
                            onClick={handleResume}
                            size="lg"
                            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700"
                        >
                            <Play className="h-5 w-5" />
                            Resume
                        </Button>
                    )}
                    
                    {(timerState.isActive || timerState.isPaused) && (
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
                        disabled={timerState.isActive}
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
                                disabled={timerState.isActive || timerState.isPaused}
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
                        {timerState.isActive && (
                            <>
                                <Zap className="h-4 w-4 text-green-500 animate-pulse" />
                                <span className="text-green-700 dark:text-green-300 font-medium">
                                    Study session in progress...
                                </span>
                            </>
                        )}
                        {timerState.isPaused && (
                            <>
                                <Pause className="h-4 w-4 text-yellow-500" />
                                <span className="text-yellow-700 dark:text-yellow-300 font-medium">
                                    Study session paused
                                </span>
                            </>
                        )}
                        {!timerState.isActive && !timerState.isPaused && (
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