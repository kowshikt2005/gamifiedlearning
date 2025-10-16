'use client';

import React, { createContext, useContext, useState, ReactNode, useCallback, useEffect, useMemo, useRef } from 'react';
import type { GenerateQuizQuestionsOutput } from '@/ai/flows/generate-quiz-questions-from-pdf';
// import { useGamification } from '@/contexts/gamification-context'; // Removed to prevent infinite loops
import { useAuth } from '@/contexts/auth-context';
import { sessionSaver } from '@/lib/session-saver';

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
    
    // Gamification integration removed - handled in feedback/results pages to prevent infinite loops
    // const { addStudySessionPoints, incrementStreak, checkQuestProgress, powerUps, addStudyTime } = useGamification();

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

    // Global timer logic - runs independently of component visibility
    useEffect(() => {
        if (timerState.isActive && timerState.timeRemaining > 0) {
            timerIntervalRef.current = setInterval(() => {
                setTimerState((prev: typeof timerState) => {
                    const newTimeRemaining = Math.max(0, prev.timeRemaining - 1);
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
    }, [timerState.isActive, timerState.timeRemaining, studyDuration]);


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

    // Track which sessions have been processed to prevent duplicates
    const processedSessionsRef = useRef<Set<string>>(new Set());
    const pendingSessionsRef = useRef<Set<string>>(new Set());
    
    const addCompletedSession = useCallback(async (session: CompletedSession) => {
        if (!user) {
            console.warn('No user found, cannot save study session');
            return;
        }

        // Check if already processed or currently being processed
        if (processedSessionsRef.current.has(session.id)) {
            console.log('⚠️ Session already processed, skipping:', session.id);
            return;
        }
        
        if (pendingSessionsRef.current.has(session.id)) {
            console.log('⚠️ Session already being processed, skipping:', session.id);
            return;
        }
        
        // Mark as pending immediately to prevent any duplicate calls
        pendingSessionsRef.current.add(session.id);
        processedSessionsRef.current.add(session.id);
        console.log('📝 Processing session:', session.id);

        // Check for duplicates in state before updating
        const existingSession = completedSessions.find((s: CompletedSession) => s.id === session.id);
        if (existingSession) {
            // eslint-disable-next-line no-console
            console.log('⚠️ Session already in state, skipping:', session.id);
            return;
        }

        // Add to state (only if not duplicate)
        setCompletedSessions((prev: CompletedSession[]) => [...prev, session]);
        
        // Calculate study time in minutes
        const studyTimeInMinutes = Math.floor(studyDuration / 60);
        
        // Save to database using robust session saver
        const saveToDatabase = async () => {
            try {
                const token = getValidToken();
                if (!token) {
                    console.warn('No valid auth token found, skipping database save');
                    return;
                }

                // Check if already processed by session saver
                if (sessionSaver.isProcessed(session.id)) {
                    console.log('⚠️ Session already processed by session saver:', session.id);
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
                    duration: Math.max(1, Math.floor(studyTimeInMinutes)),
                    score: Math.max(0, Math.min(100, calculatedScore)),
                    points: Math.max(0, Math.floor(session.points || 0)),
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

                // Use robust session saver to prevent duplicates
                await sessionSaver.saveSession(sessionData, token);
                
            } catch (error) {
                // Silently handle database save errors - don't show to user
                console.warn('Study session save failed (continuing with local storage):', error instanceof Error ? error.message : 'Unknown error');
            }
        };

        // Save in background without blocking UI
        saveToDatabase().finally(() => {
            // Remove from pending set when done
            pendingSessionsRef.current.delete(session.id);
        });
        
        // Note: Gamification points are handled separately in the feedback page
        // This prevents duplicate point additions and dependency issues
    }, [user?.username, studyDuration, quizAnswers, quizQuestions, getValidToken]); // Include quiz data for database save

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