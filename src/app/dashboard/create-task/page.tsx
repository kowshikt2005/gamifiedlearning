'use client';

import { useState, useCallback, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { Upload, FileText, Loader2, Wand2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useStudySession } from '@/contexts/study-session-context';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

// Lazy load heavy utilities to improve initial page load
const loadPDFUtils = () => import('@/lib/pdf-utils');
const loadQuizActions = () => import('@/app/actions/quiz-actions');

function CreateTaskPageContent() {
    const router = useRouter();
    const { toast } = useToast();
    const { setTaskInfo, resetSession, setStudyDuration: setTimer, setPrefetchedQuizQuestions } = useStudySession();
    const [file, setFile] = useState<File | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [progress, setProgress] = useState(0);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [processingStage, setProcessingStage] = useState<string>('');
    const [studyMinutes, setStudyMinutes] = useState<number | string>(25);

    const handleFileChange = useCallback((files: FileList | null) => {
        if (files && files[0]) {
            const selectedFile = files[0];

            // Validate file type
            if (selectedFile.type !== 'application/pdf') {
                toast({
                    variant: 'destructive',
                    title: 'Invalid File Type',
                    description: 'Please select a PDF file.',
                });
                return;
            }

            // Validate file size (100MB limit - optimized for Gemini 2.5 Flash)
            const maxSize = 100 * 1024 * 1024;
            if (selectedFile.size > maxSize) {
                toast({
                    variant: 'destructive',
                    title: 'File Too Large',
                    description: `File size must be less than 100MB. Your file is ${(selectedFile.size / 1024 / 1024).toFixed(1)}MB. Gemini 2.5 Flash can handle large documents efficiently.`,
                });
                return;
            }

            // Show info for large files
            if (selectedFile.size > 30 * 1024 * 1024) {
                toast({
                    title: 'Large Document Detected',
                    description: `Processing ${(selectedFile.size / 1024 / 1024).toFixed(1)}MB file with Gemini 2.5 Flash may take 5-10 minutes for optimal results.`,
                });
            }

            setFile(selectedFile);
        }
    }, [toast]);

    const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.currentTarget.classList.add('border-primary');
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.currentTarget.classList.remove('border-primary');
    }, []);

    const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.currentTarget.classList.remove('border-primary');
        handleFileChange(e.dataTransfer.files);
    }, [handleFileChange]);

    const handleCreateSession = useCallback(async () => {
        if (!file) {
            toast({
                variant: 'destructive',
                title: 'No File Selected',
                description: 'Please select a PDF file to start a study session.',
            });
            return;
        }

        resetSession();
        setIsProcessing(true);
        setProgress(10);

        const duration = Number(studyMinutes);
        if (isNaN(duration) || duration <= 0) {
            toast({
                variant: 'destructive',
                title: 'Invalid Duration',
                description: 'Please enter a valid study duration.',
            });
            setIsProcessing(false);
            return;
        }
        setTimer(duration * 60);

        try {
            // Load utilities dynamically for better performance
            setProcessingStage('Loading utilities...');
            setProgress(10);
            const [pdfUtils, quizActions] = await Promise.all([
                loadPDFUtils(),
                loadQuizActions()
            ]);

            setProgress(20);
            setProcessingStage('Processing PDF file...');

            // Process the PDF file with progress tracking
            const result = await pdfUtils.processPDFFile(file, (fileProgress: number) => {
                setUploadProgress(fileProgress);
                setProgress(20 + (fileProgress * 0.5)); // 20-70% for file processing
            });

            if (!result.success) {
                throw new Error(result.error);
            }

            setProgress(70);
            setProcessingStage('Preparing study session...');

            const fileName = pdfUtils.getFileNameWithoutExtension(file.name);
            if (!result.dataUri) {
                throw new Error('Failed to extract PDF data');
            }
            setTaskInfo({
                name: fileName,
                dataUri: result.dataUri
            });

            setProgress(90);

            // Pre-generate quiz questions in the background (non-blocking)
            const newTaskId = `task-${Date.now()}`;

            // Don't wait for quiz generation - do it in background
            quizActions.pregenerateQuizQuestions(result.dataUri)
                .then((quizResult) => {
                    if (quizResult.success && quizResult.questions) {
                        setPrefetchedQuizQuestions(quizResult.questions);
                    }
                })
                .catch((error) => {
                    console.warn('Quiz pre-generation failed:', error);
                });

            setProgress(100);

            toast({
                title: 'Session Ready!',
                description: `Your study session for ${file.name} is ready.`,
            });

            // Navigate immediately without waiting for quiz generation
            router.push(`/dashboard/study/${newTaskId}`);

        } catch (error) {
            console.error('Error processing file:', error);
            toast({
                variant: 'destructive',
                title: 'Error processing file',
                description: error instanceof Error ? error.message : 'An unknown error occurred'
            });
            setIsProcessing(false);
            setProgress(0);
        }
    }, [file, studyMinutes, resetSession, setTimer, setTaskInfo, router, toast, setPrefetchedQuizQuestions]);

    return (
        <div className="container mx-auto max-w-3xl py-8">
            <Card className="shadow-lg">
                <CardHeader>
                    <CardTitle className="text-2xl font-headline">Create a New Study Session</CardTitle>
                    <CardDescription>Upload a PDF document to begin your interactive learning experience.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div
                        className="flex flex-col items-center justify-center w-full p-8 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted transition-colors"
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                        onClick={() => document.getElementById('file-upload')?.click()}
                    >
                        <input id="file-upload" type="file" accept="application/pdf" className="hidden" onChange={(e) => handleFileChange(e.target.files)} />
                        {file ? (
                            <div className="text-center text-primary">
                                <FileText className="mx-auto h-12 w-12" />
                                <p className="mt-2 font-semibold truncate max-w-xs">{file.name}</p>
                                <p className="text-sm text-muted-foreground">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                            </div>
                        ) : (
                            <div className="text-center text-muted-foreground">
                                <Upload className="mx-auto h-12 w-12" />
                                <p className="mt-2 font-semibold">Drag & drop your PDF here</p>
                                <p className="text-sm">or click to browse</p>
                            </div>
                        )}
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="study-time">Study Duration (minutes)</Label>
                        <Input
                            id="study-time"
                            type="number"
                            value={studyMinutes}
                            onChange={(e) => {
                                const value = e.target.value;
                                if (value === '') {
                                    setStudyMinutes('');
                                } else {
                                    setStudyMinutes(Math.max(1, parseInt(value, 10)));
                                }
                            }}
                            min="1"
                            className="max-w-xs"
                        />
                    </div>

                    {isProcessing && (
                        <div className="space-y-4 pt-4">
                            <div className="space-y-2">
                                <div className="flex justify-between text-sm">
                                    <span>Overall Progress</span>
                                    <span>{progress}%</span>
                                </div>
                                <Progress value={progress} className="w-full" />
                            </div>

                            {uploadProgress > 0 && uploadProgress < 100 && (
                                <div className="space-y-2">
                                    <div className="flex justify-between text-sm">
                                        <span>File Processing</span>
                                        <span>{uploadProgress}%</span>
                                    </div>
                                    <Progress value={uploadProgress} className="w-full h-2" />
                                </div>
                            )}

                            <p className="text-sm text-muted-foreground text-center">
                                {processingStage || (
                                    progress < 20 ? 'Initializing...' :
                                        progress < 70 ? 'Processing document...' :
                                            progress < 90 ? 'Generating study session...' :
                                                'Preparing quiz questions...'
                                )}
                            </p>

                            {file && file.size > 10 * 1024 * 1024 && (
                                <p className="text-xs text-amber-600 text-center">
                                    Large file detected ({(file.size / 1024 / 1024).toFixed(1)} MB) - This may take a few moments
                                </p>
                            )}
                        </div>
                    )}
                    <Button
                        onClick={handleCreateSession}
                        disabled={!file || isProcessing}
                        size="lg"
                        className="w-full bg-accent hover:bg-accent/90"
                    >
                        {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wand2 className="mr-2 h-4 w-4" />}
                        Create Study Session
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}

// Loading component for better UX
function LoadingFallback() {
    return (
        <div className="container mx-auto max-w-3xl py-8">
            <Card className="shadow-lg">
                <CardHeader>
                    <div className="h-8 bg-gray-200 rounded animate-pulse mb-2"></div>
                    <div className="h-4 bg-gray-100 rounded animate-pulse w-3/4"></div>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="h-32 bg-gray-100 rounded animate-pulse"></div>
                    <div className="h-10 bg-gray-100 rounded animate-pulse w-1/3"></div>
                    <div className="h-12 bg-gray-200 rounded animate-pulse"></div>
                </CardContent>
            </Card>
        </div>
    );
}

export default function CreateTaskPage() {
    return (
        <Suspense fallback={<LoadingFallback />}>
            <CreateTaskPageContent />
        </Suspense>
    );
}