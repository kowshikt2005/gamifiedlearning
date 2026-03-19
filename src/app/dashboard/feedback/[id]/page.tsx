'use client';

import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useStudySession } from '@/contexts/study-session-context';
import { useGamification } from '@/contexts/gamification-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2, ArrowRight, TrendingUp, Target, Star, Clock, CheckCircle, Trophy, Zap, Flame } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { analyzeQuizPerformance, type AnalyzeQuizPerformanceOutput } from '@/ai/flows/analyze-quiz-performance';
import { Skeleton } from '@/components/ui/skeleton';

export default function FeedbackPage() {
    const router = useRouter();
    const params = useParams();
    const { taskInfo, quizQuestions, quizAnswers, coinsUsed, studyDuration, penaltyPoints, resetSession, addCompletedSession } = useStudySession();
    const { points, level, streak, addPoints, completeChallenge } = useGamification();
    const [isClient, setIsClient] = useState(false);
    const [analysis, setAnalysis] = useState<AnalyzeQuizPerformanceOutput | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(true);
    const pointsAwardedRef = useRef(false);
    const sessionSavedRef = useRef(false);

    useEffect(() => {
        setIsClient(true);
    }, []);

    useEffect(() => {
        if (isClient && quizQuestions && taskInfo) {
            const performAnalysis = async () => {
                setIsAnalyzing(true);
                try {
                    const result = await analyzeQuizPerformance({
                        pdfDataUri: taskInfo.dataUri,
                        questions: quizQuestions,
                        userAnswers: quizAnswers,
                    });
                    setAnalysis(result);
                } catch (error) {
                    console.error("Failed to analyze performance:", error);
                    // Set fallback data so the page is still useful
                    setAnalysis({
                        strengths: ["Could not analyze strengths. Please review your answers manually."],
                        weaknesses: ["Could not analyze weaknesses. Please review your answers manually."]
                    });
                } finally {
                    setIsAnalyzing(false);
                }
            };
            performAnalysis();
        }
    }, [isClient, quizQuestions, quizAnswers, taskInfo]);

    const score = useMemo(() => {
        if (!quizQuestions) return 0;
        return quizAnswers.reduce((correctAnswers, userAnswer) => {
            const question = quizQuestions[userAnswer.questionIndex];
            if (question && question.answer === userAnswer.answer) {
                return correctAnswers + 1;
            }
            return correctAnswers;
        }, 0);
    }, [quizQuestions, quizAnswers]);
    
    const quizPoints = useMemo(() => score * 10, [score]); // 10 points per correct answer
    const coinPenalty = useMemo(() => coinsUsed * 25, [coinsUsed]); // 25 points penalty per coin used
    const studyTimeBonus = useMemo(() => Math.floor(studyDuration / 60) * 2, [studyDuration]); // 2 points per minute studied
    const perfectScoreBonus = useMemo(() => {
        if (quizQuestions && score === quizQuestions.length) {
            return 50; // 50 bonus points for perfect score
        }
        return 0;
    }, [quizQuestions, score]);
    
    const finalPoints = useMemo(() => {
        return quizPoints + studyTimeBonus + perfectScoreBonus - coinPenalty - penaltyPoints;
    }, [quizPoints, studyTimeBonus, perfectScoreBonus, coinPenalty, penaltyPoints]);

    // Add points and save session exactly once using ref guards
    useEffect(() => {
        if (!pointsAwardedRef.current && isClient && quizQuestions && finalPoints !== 0) {
            pointsAwardedRef.current = true;
            addPoints(finalPoints);

            // Check for perfect score challenge
            if (score === quizQuestions.length) {
                completeChallenge('perfect-score');
            }

            // Check for speed demon challenge (quiz completed in under 5 minutes)
            if (studyDuration < 300) {
                completeChallenge('speed-demon');
            }
        }
    }, [isClient, finalPoints, addPoints, quizQuestions, score, studyDuration, completeChallenge]);

    useEffect(() => {
        if (!sessionSavedRef.current && isClient && taskInfo && params.id) {
            sessionSavedRef.current = true;
            addCompletedSession({
                id: params.id as string,
                taskName: taskInfo.name,
                points: finalPoints
            });
        }
    }, [isClient, taskInfo, params.id, finalPoints, addCompletedSession]);

    const formatDuration = useCallback((seconds: number) => {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = seconds % 60;
        return `${h > 0 ? `${h}h ` : ''}${m > 0 ? `${m}m ` : ''}${s}s`;
    }, []);

    const handleDone = useCallback(() => {
        resetSession();
        router.push('/dashboard');
    }, [resetSession, router]);

    if (!isClient || !quizQuestions) {
        return (
            <div className="flex flex-col h-[80vh] items-center justify-center gap-4">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                <p className="text-muted-foreground animate-pulse">Calculating your results...</p>
            </div>
        );
    }
    
    return (
        <div className="container mx-auto max-w-4xl py-8">
            {/* Gamification Header */}
            <div className="flex flex-wrap justify-between items-center mb-6 p-4 bg-gradient-to-r from-primary/10 to-accent/10 rounded-xl animate-gradientShift gap-4">
                <div className="flex flex-wrap items-center gap-4">
                    <div className="flex items-center gap-2 bg-white dark:bg-black/20 px-4 py-2 rounded-full shadow-md">
                        <Trophy className="h-5 w-5 text-primary" />
                        <span className="font-bold">Quiz Results</span>
                    </div>
                    <div className="flex items-center gap-2 bg-yellow-100 dark:bg-yellow-900/30 px-4 py-2 rounded-full">
                        <Star className="h-5 w-5 text-yellow-500 fill-yellow-500" />
                        <span className="font-bold">{points} Total Points</span>
                    </div>
                    <div className="flex items-center gap-2 bg-green-100 dark:bg-green-900/30 px-4 py-2 rounded-full">
                        <Flame className="h-5 w-5 text-red-500" />
                        <span className="font-bold">{streak} Day Streak</span>
                    </div>
                </div>
                <div className="flex items-center gap-2 bg-blue-100 dark:bg-blue-900/30 px-4 py-2 rounded-full">
                    <Zap className="h-5 w-5 text-blue-500" />
                    <span className="font-bold">Level {level}</span>
                </div>
            </div>
            
            <Card className="shadow-lg gamify-card">
                <CardHeader className="text-center">
                    <CardTitle className="text-3xl font-headline">Session Complete!</CardTitle>
                    <CardDescription>Here&apos;s a summary of your study session for &apos;{taskInfo?.name || 'your task'}&apos;</CardDescription>
                </CardHeader>
                <CardContent className="space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-center">
                        <Card className="gamify-card">
                            <CardHeader><CardTitle className="flex items-center justify-center gap-2 text-base font-medium"><Clock className="h-4 w-4"/>Study Time</CardTitle></CardHeader>
                            <CardContent><p className="text-2xl font-bold">{formatDuration(studyDuration)}</p></CardContent>
                        </Card>
                         <Card className="gamify-card">
                            <CardHeader><CardTitle className="flex items-center justify-center gap-2 text-base font-medium"><CheckCircle className="h-4 w-4"/>Quiz Score</CardTitle></CardHeader>
                            <CardContent>
                                <p className="text-2xl font-bold">{score} / {quizQuestions.length}</p>
                                <p className="text-sm text-muted-foreground">{Math.round((score / quizQuestions.length) * 100)}%</p>
                            </CardContent>
                        </Card>
                        <Card className="gamify-card">
                            <CardHeader><CardTitle className="flex items-center justify-center gap-2 text-base font-medium"><Zap className="h-4 w-4"/>XP Gained</CardTitle></CardHeader>
                            <CardContent><p className="text-2xl font-bold text-blue-600">{Math.floor(finalPoints * 1.5)}</p></CardContent>
                        </Card>
                         <Card className="gamify-card">
                            <CardHeader><CardTitle className="flex items-center justify-center gap-2 text-base font-medium"><Star className="h-4 w-4"/>Points Earned</CardTitle></CardHeader>
                            <CardContent><p className="text-2xl font-bold text-accent">{finalPoints > 0 ? `+${finalPoints}`: finalPoints}</p></CardContent>
                        </Card>
                    </div>

                    {/* Points Breakdown */}
                    <Card className="gamify-card">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Trophy className="h-5 w-5 text-yellow-500" />
                                Points Breakdown
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <div className="flex justify-between items-center">
                                <span>Quiz Performance ({score}/{quizQuestions.length} correct)</span>
                                <span className="font-bold text-green-600">+{quizPoints}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span>Study Time Bonus ({Math.floor(studyDuration / 60)} minutes)</span>
                                <span className="font-bold text-blue-600">+{studyTimeBonus}</span>
                            </div>
                            {perfectScoreBonus > 0 && (
                                <div className="flex justify-between items-center">
                                    <span>Perfect Score Bonus! 🎉</span>
                                    <span className="font-bold text-purple-600">+{perfectScoreBonus}</span>
                                </div>
                            )}
                            {coinPenalty > 0 && (
                                <div className="flex justify-between items-center">
                                    <span>Hint Penalties ({coinsUsed} hints used)</span>
                                    <span className="font-bold text-red-600">-{coinPenalty}</span>
                                </div>
                            )}
                            {penaltyPoints > 0 && (
                                <div className="flex justify-between items-center">
                                    <span>Early Finish Penalty</span>
                                    <span className="font-bold text-red-600">-{penaltyPoints}</span>
                                </div>
                            )}
                            <Separator />
                            <div className="flex justify-between items-center text-lg font-bold">
                                <span>Total Points</span>
                                <span className={finalPoints > 0 ? "text-green-600" : "text-red-600"}>
                                    {finalPoints > 0 ? `+${finalPoints}` : finalPoints}
                                </span>
                            </div>
                        </CardContent>
                    </Card>

                    <Separator />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-4">
                            <h3 className="text-xl font-semibold flex items-center gap-2"><TrendingUp className="h-5 w-5 text-primary"/>Strengths Identified</h3>
                            {isAnalyzing ? (
                                <div className="space-y-2">
                                    <Skeleton className="h-4 w-4/5" />
                                    <Skeleton className="h-4 w-3/5" />
                                    <Skeleton className="h-4 w-4/5" />
                                </div>
                            ) : (
                                <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                                    {analysis?.strengths.map((item, index) => <li key={index}>{item}</li>)}
                                </ul>
                            )}
                        </div>
                         <div className="space-y-4">
                            <h3 className="text-xl font-semibold flex items-center gap-2"><Target className="h-5 w-5 text-destructive"/>Areas for Improvement</h3>
                             {isAnalyzing ? (
                                <div className="space-y-2">
                                    <Skeleton className="h-4 w-4/5" />
                                    <Skeleton className="h-4 w-3/5" />
                                    <Skeleton className="h-4 w-4/5" />
                                </div>
                            ) : (
                                <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                                    {analysis?.weaknesses.map((item, index) => <li key={index}>{item}</li>)}
                                </ul>
                            )}
                        </div>
                    </div>

                     <div className="text-center pt-6">
                        <Button onClick={handleDone} size="lg" className="gamify-button bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90">
                           Back to Dashboard <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}