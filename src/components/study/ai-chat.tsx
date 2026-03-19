'use client';

import { useState, useEffect, useRef, useCallback, memo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Loader2, Send, MessageSquare, AlertTriangle, Sparkles, Zap, Star, Lightbulb, Timer, Play, Pause } from 'lucide-react';
import { Logo } from '../icons';
import { useGamification } from '@/contexts/gamification-context';
import { useStudySession } from '@/contexts/study-session-context';

interface AIChatProps {
    pdfDataUri: string;
}

type Message = {
    role: 'user' | 'bot' | 'error';
    content: string;
};

// Memoize the AIChat component to prevent unnecessary re-renders
export const AIChat = memo(function AIChat({ pdfDataUri }: AIChatProps) {
    const { points, addPoints, checkQuestProgress } = useGamification();
    const { timerState } = useStudySession();
    const [messages, setMessages] = useState<Message[]>([
        { role: 'bot', content: "Hey there! Ask me anything about the document and I'll help you out." }
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [streamingMessage, setStreamingMessage] = useState('');
    const [streak, setStreak] = useState(0);
    const scrollViewportRef = useRef<HTMLDivElement>(null);
    const abortControllerRef = useRef<AbortController | null>(null);
    const questionCountRef = useRef(0);

    // Scroll to bottom effect
    useEffect(() => {
        if (scrollViewportRef.current) {
            scrollViewportRef.current.scrollTop = scrollViewportRef.current.scrollHeight;
        }
    }, [messages, streamingMessage]);

    // Memoize the send message function
    const handleSendMessage = useCallback(async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || isLoading) return;

        // Add user message to chat
        const userMessage: Message = { role: 'user', content: input };
        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);
        setStreamingMessage('');

        try {
            // Create abort controller for cancellation
            abortControllerRef.current = new AbortController();
            
            // Get auth token for user-specific caching
            const token = localStorage.getItem('auth-token');
            const headers: HeadersInit = {
                'Content-Type': 'application/json',
            };
            
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }

            // Call the new API endpoint
            const response = await fetch('/api/ai/chat', {
                method: 'POST',
                headers,
                body: JSON.stringify({ pdfDataUri, question: input }),
                signal: abortControllerRef.current.signal,
            });

            const result = await response.json();
            
            if (result.success || result.answer) {
                const answer = result.answer;
                
                // Simulate streaming effect
                let accumulatedResponse = '';
                setStreamingMessage('');
                
                const chunks = [];
                for (let i = 0; i < answer.length; i += 5) {
                    chunks.push(answer.slice(i, i + 5));
                }
                
                for (const chunk of chunks) {
                    // Check if operation was cancelled
                    if (abortControllerRef.current?.signal.aborted) break;
                    
                    accumulatedResponse += chunk;
                    setStreamingMessage(accumulatedResponse);
                    
                    // Small delay to simulate streaming
                    await new Promise(resolve => setTimeout(resolve, 20));
                }
                
                // Add final bot message if not cancelled
                if (!abortControllerRef.current?.signal.aborted) {
                    const botMessage: Message = { role: 'bot', content: answer };
                    setMessages(prev => [...prev, botMessage]);
                    setStreamingMessage('');
                    
                    // Gamification: Add points and update quest progress
                    const pointsEarned = 5 + Math.floor(answer.length / 100); // Bonus points for longer responses
                    addPoints(pointsEarned);
                    questionCountRef.current += 1;
                    checkQuestProgress('ai-chat-10', 1);
                    
                    // Update streak
                    setStreak(prev => prev + 1);
                    
                    // Show success feedback if there was an error but we got a fallback
                    if (result.error) {
                        const errorMessage: Message = { 
                            role: 'error', 
                            content: `Note: ${result.error}` 
                        };
                        setMessages(prev => [...prev, errorMessage]);
                    }
                }
            } else {
                throw new Error(result.error || 'Failed to get AI response');
            }
        } catch (error) {
            console.error('AI Chat error:', error);
            
            if (error instanceof Error && error.name === 'AbortError') {
                // Request was cancelled
                return;
            }
            
            let errorMessage = "Sorry, I encountered an error. Please try again. 😔";
            
            if (error instanceof Error) {
                if (error.message.includes('timeout')) {
                    errorMessage = "I'm taking too long to respond. Please try a simpler question. 🕐";
                } else if (error.message.includes('PDF')) {
                    errorMessage = "I'm having trouble reading the document. Please make sure it loaded properly. 📄";
                }
            }
            
            const errorMsg: Message = { role: 'error', content: errorMessage };
            setMessages(prev => [...prev, errorMsg]);
            setStreamingMessage('');
        } finally {
            setIsLoading(false);
            abortControllerRef.current = null;
        }
    }, [input, isLoading, pdfDataUri, addPoints, checkQuestProgress]);
    
    // Handle cancel streaming
    const handleCancelStreaming = useCallback(() => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
            abortControllerRef.current = null;
        }
        setIsLoading(false);
        setStreamingMessage('');
    }, []);

    // Format time display for timer indicator
    const formatTime = (seconds: number) => {
        const minutes = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <Card className="flex flex-col h-full transition-all duration-300 hover:shadow-xl gamify-card rounded-xl overflow-hidden border-2 border-primary/20">
            <CardHeader className="flex flex-row items-center justify-between bg-gradient-to-r from-primary/10 to-accent/10 pb-3">
                <div className="flex items-center gap-2">
                    <div className="relative">
                        <MessageSquare className="h-6 w-6 text-primary animate-pulse" />
                        <Sparkles className="h-3 w-3 text-yellow-500 absolute -top-1 -right-1 animate-pulse" />
                    </div>
                    <CardTitle className="font-headline text-xl">Study Chat</CardTitle>
                </div>
                <div className="flex items-center gap-3">
                    {/* Timer Status Indicator */}
                    <div className={`flex items-center gap-1 px-2 py-1 rounded-full transition-all duration-300 ${
                        timerState.isActive 
                            ? 'bg-green-100 dark:bg-green-900/30 animate-pulse' 
                            : timerState.isPaused 
                                ? 'bg-yellow-100 dark:bg-yellow-900/30' 
                                : 'bg-gray-100 dark:bg-gray-900/30'
                    }`}>
                        {timerState.isActive ? (
                            <Play className="h-4 w-4 text-green-500" />
                        ) : timerState.isPaused ? (
                            <Pause className="h-4 w-4 text-yellow-500" />
                        ) : (
                            <Timer className="h-4 w-4 text-gray-500" />
                        )}
                        <span className="text-sm font-bold font-mono">
                            {formatTime(timerState.timeRemaining)}
                        </span>
                    </div>
                    <div className="flex items-center gap-1 bg-yellow-100 dark:bg-yellow-900/30 px-2 py-1 rounded-full">
                        <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                        <span className="text-sm font-bold">{points}</span>
                    </div>
                    <div className="flex items-center gap-1 bg-green-100 dark:bg-green-900/30 px-2 py-1 rounded-full">
                        <Zap className="h-4 w-4 text-green-500" />
                        <span className="text-sm font-bold">{streak}</span>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="flex flex-col h-full p-0 bg-gradient-to-b from-background to-muted/20">
                <ScrollArea className="flex-grow p-4 chat-scroll-area" viewportRef={scrollViewportRef}>
                    <div className="space-y-4 pr-2">
                        {messages.map((msg, index) => (
                            <div 
                                key={index} 
                                className={`flex items-end gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-popIn`}
                            >
                                {msg.role !== 'user' && (
                                    <Avatar className="h-10 w-10 border-2 border-primary animate-bounceIn flex-shrink-0">
                                        <AvatarFallback className={`${msg.role === 'error' ? 'bg-destructive' : 'bg-primary'} text-white`}>
                                            {msg.role === 'error' ? <AlertTriangle className="h-5 w-5 text-destructive-foreground"/> : <Logo className="h-5 w-5 text-primary-foreground"/>}
                                        </AvatarFallback>
                                    </Avatar>
                                )}
                                <div className={`max-w-[85%] rounded-2xl p-4 text-sm transition-all duration-300 shadow-md ${
                                    msg.role === 'user' 
                                        ? 'bg-primary text-primary-foreground rounded-br-none animate-slideInRight' 
                                        : msg.role === 'error' 
                                            ? 'bg-destructive/10 text-destructive rounded-bl-none animate-shake border border-destructive/20' 
                                            : 'bg-muted rounded-bl-none animate-slideInLeft border border-muted-foreground/10'
                                }`}>
                                    {msg.content}
                                </div>
                                {msg.role === 'user' && (
                                    <Avatar className="h-10 w-10 border-2 border-accent animate-bounceIn flex-shrink-0">
                                        <AvatarFallback className="bg-accent text-accent-foreground">
                                            👤
                                        </AvatarFallback>
                                    </Avatar>
                                )}
                            </div>
                        ))}
                        {streamingMessage && (
                            <div className="flex items-end gap-2 justify-start animate-popIn">
                                <Avatar className="h-10 w-10 border-2 border-primary animate-bounce flex-shrink-0">
                                    <AvatarFallback className="bg-primary text-white">
                                        <Logo className="h-5 w-5 text-primary-foreground"/>
                                    </AvatarFallback>
                                </Avatar>
                                <div className="bg-muted rounded-2xl p-4 rounded-bl-none animate-pulse shadow-md border border-muted-foreground/10">
                                    <div className="flex items-center gap-2">
                                        <span>{streamingMessage}</span>
                                        <Loader2 className="h-4 w-4 animate-spin text-primary" />
                                    </div>
                                </div>
                            </div>
                        )}
                        {isLoading && !streamingMessage && (
                            <div className="flex items-end gap-2 justify-start animate-popIn">
                                <Avatar className="h-10 w-10 border-2 border-primary animate-bounce flex-shrink-0">
                                    <AvatarFallback className="bg-primary text-white">
                                        <Logo className="h-5 w-5 text-primary-foreground"/>
                                    </AvatarFallback>
                                </Avatar>
                                <div className="bg-muted rounded-2xl p-4 rounded-bl-none shadow-md border border-muted-foreground/10">
                                    <div className="flex items-center gap-2">
                                        <div className="flex space-x-1">
                                            <div className="h-2 w-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                                            <div className="h-2 w-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                                            <div className="h-2 w-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                                        </div>
                                        <span className="text-muted-foreground">Thinking...</span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </ScrollArea>
                <div className="p-4 border-t bg-background/50 backdrop-blur-sm mt-auto">
                    <form onSubmit={handleSendMessage} className="flex gap-2">
                        <div className="relative flex-1">
                            <Input 
                                value={input} 
                                onChange={(e) => setInput(e.target.value)} 
                                placeholder="Ask a question about the document..." 
                                disabled={isLoading}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                        handleSendMessage(e);
                                    }
                                }}
                                className="pr-10 transition-all duration-300 focus:ring-2 focus:ring-primary pl-4 py-5 rounded-full border-2 border-primary/20 focus:border-primary"
                            />
                            {input.trim() && (
                                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                                    <Lightbulb className="h-4 w-4 text-yellow-500 animate-pulse" />
                                </div>
                            )}
                        </div>
                        <div className="flex gap-2">
                            {isLoading && (
                                <Button 
                                    type="button"
                                    variant="outline" 
                                    size="icon" 
                                    onClick={handleCancelStreaming}
                                    className="gamify-button h-12 w-12 rounded-full border-2 border-destructive/50 hover:border-destructive transition-all duration-300"
                                >
                                    <span className="text-lg">✕</span>
                                </Button>
                            )}
                            <Button 
                                type="submit" 
                                size="icon" 
                                disabled={isLoading || !input.trim()} 
                                className="gamify-button h-12 w-12 rounded-full bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 transition-all duration-300 shadow-lg hover:shadow-xl"
                            >
                                <Send className="h-5 w-5" />
                            </Button>
                        </div>
                    </form>
                    <div className="mt-2 text-center">
                        <p className="text-xs text-muted-foreground animate-fadeIn">
                            💡 Tip: Ask specific questions about the document content for better results!
                        </p>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
});