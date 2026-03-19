'use client';

import React, { createContext, useContext, useState, ReactNode, useCallback, useEffect, useMemo, useRef } from 'react';
import type { GenerateQuizQuestionsOutput } from '@/ai/flows/generate-quiz-questions-from-pdf';
import { useGamification } from '@/contexts/gamification-context';
import { useAuth } from '@/contexts/auth-context';

type TaskInfo = {
    name: string;
    dataUri: string;
};

type QuizAnswer = {
    questionIndex: number;
    answer: string;
};

type CompletedSession = {
    id: string;
    taskName: string;
    points: number;
}

interface StudySessionContextType {
    taskInfo: TaskInfo | null;
    setTaskInfo: (info: TaskInfo | null) => void;
    
    quizQuestions: GenerateQuizQuestionsOutput['questions'] | null;
    setQuizQuestions: (questions: GenerateQuizQuestionsOutput['questions'] | null) => void;

    quizAnswers: QuizAnswer[];
    addQuizAnswer: (answer: QuizAnswer) => void;
    getAnswerForQuestion: (questionIndex: number) => string | undefined;

    coinsUsed: number;
    useCoin: () => boolean;

    studyDuration: number; 
    setStudyDuration: (duration: number) => void;

    penaltyPoints: number;
    addPenalty: (points: number) => void;

    completedSessions: CompletedSession[];
    addCompletedSession: (session: CompletedSession) => void;

    resetSession: () => void;
    
    // Prefetched data
    prefetchedQuizQuestions: GenerateQuizQuestionsOutput['questions'] | null;
    setPrefetchedQuizQuestions: (questions: GenerateQuizQuestionsOutput['questions'] | null) => void;

    // Timer state - persistent across tab switches
    timerState: {
        timeRemaining: number;
        isActive: boolean;
        isPaused: boolean;
        elapsedTime: number;
        sessionStartTime: Date | null;
    };
    updateTimerState: (updates: Partial<StudySessionContextType['timerState']>) => void;
    resetTimer: () => void;
}

const StudySessionContext = createContext<StudySessionContextType | undefined>(undefined);

export function StudySessionProvider({ children }: { children: ReactNode }) {
    const { user, getValidToken } = useAuth();
    const [taskInfo, setTaskInfo] = useState<TaskInfo | null>(null);
    const [quizQuestions, setQuizQuestions] = useState<GenerateQuizQuestionsOutput['questions'] | null>(null);
    const [quizAnswers, setQuizAnswers] = useState<QuizAnswer[]>([]);
    const [coinsUsed, setCoinsUsed] = useState(0);
    const [studyDuration, setStudyDuration] = useState(25 * 60); // Default to 25 mins in seconds
    const [penaltyPoints, setPenaltyPoints] = useState(0);
    const [completedSessions, setCompletedSessions] = useState<CompletedSession[]>([]);
    const [prefetchedQuizQuestions, setPrefetchedQuizQuestions] = useState<GenerateQuizQuestionsOutput['questions'] | null>(null);
    
    // Timer state - persistent across component unmounts and tab switches
    const [timerState, setTimerState] = useState({
        timeRemaining: 25 * 60,
        isActive: false,
        isPaused: false,
        elapsedTime: 0,
        sessionStartTime: null as Date | null,
    });
    
    // Timer interval ref - persistent across renders
    const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
    
    // Integrate with gamification system
    const { addPoints, addStudySessionPoints, incrementStreak, checkQuestProgress, addStudyTime } = useGamification();

    // Load completed sessions from localStorage on initial client-side render
    useEffect(() => {
        if (typeof window === 'undefined') return;
        
        try {
            const savedSessions = localStorage.getItem('completedSessions');
            if (savedSessions) {
                setCompletedSessions(JSON.parse(savedSessions));
            }
        } catch (error) {
            console.error('Failed to load sessions from localStorage', error);
        }
    }, []);

    // Save completed sessions to localStorage whenever they change
    useEffect(() => {
        if (typeof window === 'undefined') return;
        
        try {
            localStorage.setItem('completedSessions', JSON.stringify(completedSessions));
        } catch (error) {
            console.error('Failed to save sessions to localStorage', error);
        }
    }, [completedSessions]);

    // Global timer logic - interval created once when active, ticks independently.
    // NOT dependent on timeRemaining to avoid interval churn during heavy rendering.
    useEffect(() => {
        if (timerState.isActive) {
            timerIntervalRef.current = setInterval(() => {
                setTimerState((prev: typeof timerState) => {
                    if (prev.timeRemaining <= 0) return prev; // Already done
                    const newTimeRemaining = prev.timeRemaining - 1;
                    const newElapsedTime = studyDuration - newTimeRemaining;
                    return {
                        ...prev,
                        timeRemaining: newTimeRemaining,
                        elapsedTime: newElapsedTime,
                    };
                });
            }, 1000);
        } else {
            if (timerIntervalRef.current) {
                clearInterval(timerIntervalRef.current);
                timerIntervalRef.current = null;
            }
        }

        return () => {
            if (timerIntervalRef.current) {
                clearInterval(timerIntervalRef.current);
                timerIntervalRef.current = null;
            }
        };
    }, [timerState.isActive, studyDuration]);


    const addQuizAnswer = useCallback((newAnswer: QuizAnswer) => {
        setQuizAnswers((prev: QuizAnswer[]) => {
            const existingIndex = prev.findIndex((a: QuizAnswer) => a.questionIndex === newAnswer.questionIndex);
            if (existingIndex > -1) {
                const updatedAnswers = [...prev];
                updatedAnswers[existingIndex] = newAnswer;
                return updatedAnswers;
            }
            return [...prev, newAnswer];
        });
    }, []);

    const getAnswerForQuestion = useCallback((questionIndex: number) => {
        return quizAnswers.find((a: QuizAnswer) => a.questionIndex === questionIndex)?.answer;
    }, [quizAnswers]);
    
    const useCoin = useCallback(() => {
        if (coinsUsed >= 3) {
            return false; // Cannot use more than 3 coins
        }
        setCoinsUsed((prev: number) => prev + 1);
        // Gamification: Answer reveal penalty - handled in quiz points calculation
        return true;
    }, [coinsUsed]);
    
    const addPenalty = useCallback((points: number) => {
        setPenaltyPoints((prev: number) => prev + points);
        // Gamification: Penalties handled in session completion
    }, []);

    const addCompletedSession = useCallback(async (session: CompletedSession) => {
        if (!user) {
            console.warn('No user found, cannot save study session');
            return;
        }

        setCompletedSessions((prev: CompletedSession[]) => {
            // Avoid adding duplicates
            if (prev.find((s: CompletedSession) => s.id === session.id)) {
                return prev;
            }
            return [...prev, session]
        });
        
        // Calculate study time in minutes
        const studyTimeInMinutes = Math.floor(studyDuration / 60);
        
        // Save to database - but don't block the UI if it fails
        const saveToDatabase = async () => {
            try {
                const token = getValidToken();
                if (!token) {
                    console.warn('No valid auth token found, skipping database save');
                    return;
                }

                // Calculate quiz score based on answers
                const totalQuestions = quizAnswers.length;
                const correctAnswers = quizAnswers.filter(qa => {
                    if (!quizQuestions || qa.questionIndex >= quizQuestions.length) return false;
                    const question = quizQuestions[qa.questionIndex];
                    return question.answer === qa.answer;
                }).length;
                const calculatedScore = totalQuestions > 0 ? Math.round((correctAnswers / totalQuestions) * 100) : 85;

                const sessionData = {
                    id: session.id || `session_${Date.now()}`,
                    taskName: session.taskName || 'Study Session',
                    duration: Math.max(1, Math.floor(studyTimeInMinutes)), // Ensure positive integer
                    score: Math.max(0, Math.min(100, calculatedScore)), // Calculate from quiz answers
                    points: Math.max(0, Math.floor(session.points || 0)), // Ensure positive integer
                    quizAnswers: (quizAnswers || []).map((qa: QuizAnswer) => {
                        const isCorrect = quizQuestions && qa.questionIndex < quizQuestions.length 
                            ? quizQuestions[qa.questionIndex].answer === qa.answer
                            : false;
                        return {
                            questionIndex: Math.max(0, Math.floor(qa.questionIndex || 0)),
                            answer: String(qa.answer || ''),
                            correct: Boolean(isCorrect)
                        };
                    })
                };

                // Attempting to save study session to database

                const response = await fetch('/api/user/study-session', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`,
                    },
                    body: JSON.stringify(sessionData),
                });

                if (!response.ok) {
                    const errorData = await response.text();
                    let errorMessage = 'Failed to save study session';
                    
                    try {
                        const errorObj = JSON.parse(errorData);
                        errorMessage = errorObj.error || errorMessage;
                    } catch {
                        // If parsing fails, use the raw error data
                        errorMessage = errorData || errorMessage;
                    }
                    
                    console.error('Failed to save study session:', response.status, errorMessage);
                } else {
                    await response.json();
                    // Study session saved successfully - no need to log in production
                }
            } catch (error) {
                // Silently handle database save errors - don't show to user
                // The session is still saved locally and the user can continue
                console.warn('Study session save failed (continuing with local storage):', error instanceof Error ? error.message : 'Unknown error');
            }
        };

        // Save in background without blocking UI
        saveToDatabase();

        // Award quiz points (correct/wrong/reveal scoring from results page)
        if (session.points !== 0) {
            addPoints(session.points);
        }

        // Award study session time points separately
        addStudySessionPoints(studyTimeInMinutes, true);

        // Update quest progress
        checkQuestProgress('quiz-5', 1);
        checkQuestProgress('study-60', studyTimeInMinutes);

        // Increment streak
        incrementStreak();

        // Add study time to total
        addStudyTime(studyTimeInMinutes);
    }, [user, studyDuration, quizAnswers, addStudySessionPoints, addPoints, checkQuestProgress, incrementStreak, addStudyTime, getValidToken, quizQuestions]);

    // Sync timer duration with study duration
    useEffect(() => {
        if (!timerState.isActive && !timerState.isPaused) {
            setTimerState((prev: typeof timerState) => ({
                ...prev,
                timeRemaining: studyDuration,
                elapsedTime: 0,
            }));
        }
    }, [studyDuration, timerState.isActive, timerState.isPaused]);

    // Timer management functions
    const updateTimerState = useCallback((updates: Partial<typeof timerState>) => {
        setTimerState((prev: typeof timerState) => ({ ...prev, ...updates }));
    }, []);

    const resetTimer = useCallback(() => {
        setTimerState({
            timeRemaining: studyDuration,
            isActive: false,
            isPaused: false,
            elapsedTime: 0,
            sessionStartTime: null,
        });
    }, [studyDuration]);

    const resetSession = useCallback(() => {
        setTaskInfo(null);
        setQuizQuestions(null);
        setQuizAnswers([]);
        setCoinsUsed(0);
        setStudyDuration(25 * 60);
        resetTimer();
        setPenaltyPoints(0);
        setPrefetchedQuizQuestions(null);
    }, [resetTimer])

    // Memoize the context value to prevent unnecessary re-renders
    const value = useMemo(() => ({
        taskInfo, setTaskInfo,
        quizQuestions, setQuizQuestions,
        quizAnswers, addQuizAnswer, getAnswerForQuestion,
        coinsUsed, useCoin,
        studyDuration, setStudyDuration,
        penaltyPoints, addPenalty,
        completedSessions, addCompletedSession,
        resetSession,
        prefetchedQuizQuestions, setPrefetchedQuizQuestions,
        timerState, updateTimerState, resetTimer
    }), [
        taskInfo, quizQuestions, quizAnswers, coinsUsed, studyDuration, 
        penaltyPoints, completedSessions, resetSession, prefetchedQuizQuestions,
        addQuizAnswer, getAnswerForQuestion, useCoin, addPenalty, 
        addCompletedSession, setPrefetchedQuizQuestions, timerState, updateTimerState, resetTimer
    ]);

    return <StudySessionContext.Provider value={value}>{children}</StudySessionContext.Provider>;
}

export function useStudySession() {
    const context = useContext(StudySessionContext);
    if (context === undefined) {
        throw new Error('useStudySession must be used within a StudySessionProvider');
    }
    return context;
}