'use client';

import React, { Component, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { RefreshCw, Wifi, AlertTriangle } from 'lucide-react';

interface ChunkErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  isChunkError: boolean;
}

interface ChunkErrorBoundaryProps {
  children: ReactNode;
}

export class ChunkErrorBoundary extends Component<ChunkErrorBoundaryProps, ChunkErrorBoundaryState> {
  private retryCount = 0;
  private maxRetries = 3;

  constructor(props: ChunkErrorBoundaryProps) {
    super(props);
    this.state = { 
      hasError: false, 
      isChunkError: false 
    };
  }

  static getDerivedStateFromError(error: Error): ChunkErrorBoundaryState {
    // Check if it's a chunk loading error
    const isChunkError = error.message.includes('Loading chunk') || 
                        error.message.includes('ChunkLoadError') ||
                        error.name === 'ChunkLoadError';
    
    return { 
      hasError: true, 
      error,
      isChunkError 
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Chunk loading error caught:', error, errorInfo);
    
    // Auto-retry for chunk errors
    if (this.state.isChunkError && this.retryCount < this.maxRetries) {
      this.retryCount++;
      setTimeout(() => {
        this.setState({ hasError: false, error: undefined, isChunkError: false });
      }, 1000 * this.retryCount); // Exponential backoff
    }
  }

  handleRetry = () => {
    this.retryCount++;
    this.setState({ hasError: false, error: undefined, isChunkError: false });
  };

  handleHardRefresh = () => {
    // Clear all caches and reload
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then(registrations => {
        registrations.forEach(registration => registration.unregister());
      });
    }
    
    // Clear browser cache
    if ('caches' in window) {
      caches.keys().then(names => {
        names.forEach(name => caches.delete(name));
      });
    }
    
    // Force reload
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-background">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-orange-100">
                {this.state.isChunkError ? (
                  <Wifi className="h-6 w-6 text-orange-600" />
                ) : (
                  <AlertTriangle className="h-6 w-6 text-red-600" />
                )}
              </div>
              <CardTitle>
                {this.state.isChunkError ? 'Connection Issue' : 'Something went wrong'}
              </CardTitle>
              <CardDescription>
                {this.state.isChunkError 
                  ? 'Failed to load application resources. This usually resolves with a refresh.'
                  : 'We encountered an unexpected error. Please try refreshing the page.'
                }
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {this.state.error && (
                <div className="rounded-md bg-red-50 p-3">
                  <p className="text-sm text-red-800 font-mono">
                    {this.state.error.message}
                  </p>
                </div>
              )}
              
              <div className="flex flex-col gap-2">
                <Button onClick={this.handleRetry} className="w-full">
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Try Again {this.retryCount > 0 && `(${this.retryCount}/${this.maxRetries})`}
                </Button>
                
                {this.state.isChunkError && (
                  <Button 
                    variant="outline" 
                    onClick={this.handleHardRefresh}
                    className="w-full"
                  >
                    <Wifi className="mr-2 h-4 w-4" />
                    Refresh Page
                  </Button>
                )}
                
                <Button 
                  variant="ghost" 
                  onClick={() => window.location.href = '/'}
                  className="w-full"
                >
                  Go to Home
                </Button>
              </div>
              
              {this.retryCount >= this.maxRetries && (
                <div className="text-center text-sm text-muted-foreground">
                  <p>Still having issues? Try:</p>
                  <ul className="mt-2 space-y-1">
                    <li>• Check your internet connection</li>
                    <li>• Clear browser cache</li>
                    <li>• Try a different browser</li>
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}