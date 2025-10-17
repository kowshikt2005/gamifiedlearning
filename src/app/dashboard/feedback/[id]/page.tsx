'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useStudySession } from '@/contexts/study-session-context';
import { useGamification } from '@/contexts/gamification-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, ArrowRight, TrendingUp, Target, Clock, CheckCircle, Trophy, Award, BookOpen } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { analyzeQuizPerformance, type AnalyzeQuizPerformanceOutput } from '@/ai/flows/analyze-quiz-performance';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';

export default function FeedbackPage() {
    const router = useRouter();
    const params = useParams();
    const { taskInfo, quizQuestions, quizAnswers, coinsUsed, studyDuration, penaltyPoints, resetSession, addCompletedSession } = useStudySession();
    const gamification = useGamification();
    const [isClient, setIsClient] = useState(false);
    const [analysis, setAnalysis] = useState<AnalyzeQuizPerformanceOutput | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(true);
    const [finalPoints, setFinalPoints] = useState(0);
    const [isProcessingComplete, setIsProcessingComplete] = useState(false);

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
    
    const correctAnswers = score;
    const wrongAnswers = quizQuestions ? quizQuestions.length - score : 0;
    const totalQuestions = quizQuestions ? quizQuestions.length : 0;
    const scorePercentage = totalQuestions > 0 ? Math.round((score / totalQuestions) * 100) : 0;

    // Single useEffect to handle all processing - runs only once when data is ready
    useEffect(() => {
        if (isProcessingComplete) return;
        if (!isClient) return;
        if (!quizQuestions || quizQuestions.length === 0) return;
        if (quizAnswers.length === 0) return;
        if (!taskInfo || !params.id) return;
        
        setIsProcessingComplete(true);
        
        const processQuizCompletion = async () => {
            try {
                const result = await gamification.processQuizCompletion({
                    correctAnswers,
                    wrongAnswers,
                    answersRevealed: coinsUsed,
                    totalQuestions,
                    timeSpent: studyDuration
                });
                
                const totalPoints = result?.pointsEarned || 0;
                setFinalPoints(totalPoints);
                
                addCompletedSession({
                    id: params.id as string,
                    taskName: taskInfo.name,
                    points: totalPoints
                });
                
                return totalPoints;
            } catch (error) {
                console.error('Failed to process quiz completion:', error);
                setFinalPoints(0);
                return 0;
            }
        };
        
        processQuizCompletion();
        
    }, [
        isProcessingComplete, 
        isClient, 
        quizQuestions?.length, 
        quizAnswers.length, 
        taskInfo?.name, 
        params.id
    ]);

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
            <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
                <div className="text-center space-y-4">
                    <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
                    <p className="text-muted-foreground animate-pulse">Analyzing your performance...</p>
                </div>
            </div>
        );
    }
    
    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
            <div className="container mx-auto px-4 py-8 max-w-6xl">
                
                {/* Hero Section */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-r from-green-400 to-blue-500 rounded-full mb-4">
                        <Trophy className="h-10 w-10 text-white" />
                    </div>
                    <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
                        Quiz Complete!
                    </h1>
                    <p className="text-xl text-gray-600 dark:text-gray-300">
                        Great work on &quot;{taskInfo?.name || 'your study session'}&quot;
                    </p>
                </div>

                {/* Score Overview Card */}
                <Card className="mb-8 border-0 shadow-xl bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
                    <CardContent className="p-8">
                        <div className="text-center mb-6">
                            <div className="text-6xl font-bold text-gray-900 dark:text-white mb-2">
                                {scorePercentage}%
                            </div>
                            <div className="text-lg text-gray-600 dark:text-gray-300">
                                {score} out of {totalQuestions} correct
                            </div>
                            <Progress value={scorePercentage} className="w-full max-w-md mx-auto mt-4 h-3" />
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                            <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
                                <Clock className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                                    {formatDuration(studyDuration)}
                                </div>
                                <div className="text-sm text-gray-600 dark:text-gray-300">Study Time</div>
                            </div>
                            
                            <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-xl">
                                <CheckCircle className="h-8 w-8 text-green-600 mx-auto mb-2" />
                                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                                    {correctAnswers}
                                </div>
                                <div className="text-sm text-gray-600 dark:text-gray-300">Correct Answers</div>
                            </div>
                            
                            <div className="text-center p-4 bg-purple-50 dark:bg-purple-900/20 rounded-xl">
                                <Award className="h-8 w-8 text-purple-600 mx-auto mb-2" />
                                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                                    {Math.floor(finalPoints * 1.5)}
                                </div>
                                <div className="text-sm text-gray-600 dark:text-gray-300">XP Gained</div>
                            </div>
                            
                            <div className="text-center p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-xl">
                                <Trophy className="h-8 w-8 text-yellow-600 mx-auto mb-2" />
                                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                                    {finalPoints > 0 ? `+${finalPoints}` : finalPoints}
                                </div>
                                <div className="text-sm text-gray-600 dark:text-gray-300">Points Earned</div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                    
                    {/* Points Breakdown */}
                    <Card className="border-0 shadow-xl bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-xl">
                                <Trophy className="h-6 w-6 text-yellow-500" />
                                Points Breakdown
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex justify-between items-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                                <span className="font-medium">Correct Answers ({correctAnswers} × 5)</span>
                                <span className="font-bold text-green-600">+{correctAnswers * 5}</span>
                            </div>
                            
                            {wrongAnswers > 0 && (
                                <div className="flex justify-between items-center p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                                    <span className="font-medium">Wrong Answers ({wrongAnswers} × -1)</span>
                                    <span className="font-bold text-red-600">-{wrongAnswers}</span>
                                </div>
                            )}
                            
                            {coinsUsed > 0 && (
                                <div className="flex justify-between items-center p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                                    <span className="font-medium">Answer Reveals ({coinsUsed} × -10)</span>
                                    <span className="font-bold text-orange-600">-{coinsUsed * 10}</span>
                                </div>
                            )}
                            
                            {correctAnswers === totalQuestions && totalQuestions > 0 && (
                                <div className="flex justify-between items-center p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                                    <span className="font-medium">Perfect Score Bonus! 🎉</span>
                                    <span className="font-bold text-purple-600">+50</span>
                                </div>
                            )}
                            
                            {penaltyPoints > 0 && (
                                <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700/20 rounded-lg">
                                    <span className="font-medium">Early Finish Penalty</span>
                                    <span className="font-bold text-gray-600">-{penaltyPoints}</span>
                                </div>
                            )}
                            
                            <Separator />
                            
                            <div className="flex justify-between items-center p-4 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-lg">
                                <span className="text-lg font-bold">Total Points</span>
                                <span className={`text-xl font-bold ${finalPoints > 0 ? "text-green-600" : "text-red-600"}`}>
                                    {finalPoints > 0 ? `+${finalPoints}` : finalPoints}
                                </span>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Performance Analysis */}
                    <Card className="border-0 shadow-xl bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-xl">
                                <BookOpen className="h-6 w-6 text-blue-500" />
                                Performance Analysis
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            
                            {/* Strengths */}
                            <div>
                                <h3 className="text-lg font-semibold flex items-center gap-2 mb-3">
                                    <TrendingUp className="h-5 w-5 text-green-500" />
                                    Strengths
                                </h3>
                                {isAnalyzing ? (
                                    <div className="space-y-2">
                                        <Skeleton className="h-4 w-full" />
                                        <Skeleton className="h-4 w-3/4" />
                                        <Skeleton className="h-4 w-5/6" />
                                    </div>
                                ) : (
                                    <ul className="space-y-2">
                                        {analysis?.strengths.map((item, index) => (
                                            <li key={index} className="flex items-start gap-2 p-2 bg-green-50 dark:bg-green-900/20 rounded-lg">
                                                <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
                                                <span className="text-sm text-gray-700 dark:text-gray-300">{item}</span>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                            
                            {/* Areas for Improvement */}
                            <div>
                                <h3 className="text-lg font-semibold flex items-center gap-2 mb-3">
                                    <Target className="h-5 w-5 text-orange-500" />
                                    Areas for Improvement
                                </h3>
                                {isAnalyzing ? (
                                    <div className="space-y-2">
                                        <Skeleton className="h-4 w-full" />
                                        <Skeleton className="h-4 w-4/5" />
                                        <Skeleton className="h-4 w-3/4" />
                                    </div>
                                ) : (
                                    <ul className="space-y-2">
                                        {analysis?.weaknesses.map((item, index) => (
                                            <li key={index} className="flex items-start gap-2 p-2 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                                                <div className="w-2 h-2 bg-orange-500 rounded-full mt-2 flex-shrink-0"></div>
                                                <span className="text-sm text-gray-700 dark:text-gray-300">{item}</span>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Action Button */}
                <div className="text-center">
                    <Button 
                        onClick={handleDone} 
                        size="lg" 
                        className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-8 py-3 text-lg font-semibold shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all duration-200"
                    >
                        Back to Dashboard
                        <ArrowRight className="ml-2 h-5 w-5" />
                    </Button>
                </div>
            </div>
        </div>
    );
}