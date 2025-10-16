/**
 * Robust session saving utility to prevent duplicate API calls
 * Uses multiple strategies to ensure sessions are saved only once
 */

import { studySessionCircuitBreaker } from './circuit-breaker';
import { resilientFetch } from './client-error-handler';

interface SessionData {
  id: string;
  taskName: string;
  duration: number;
  score: number;
  points: number;
  quizAnswers: Array<{
    questionIndex: number;
    answer: string;
    correct: boolean;
  }>;
}

class SessionSaver {
  private static instance: SessionSaver;
  private processedSessions = new Set<string>();
  private pendingSessions = new Map<string, Promise<void>>();
  private saveQueue = new Map<string, SessionData>();
  private saveTimeout: NodeJS.Timeout | null = null;

  private constructor() {}

  static getInstance(): SessionSaver {
    if (!SessionSaver.instance) {
      SessionSaver.instance = new SessionSaver();
    }
    return SessionSaver.instance;
  }

  /**
   * Save a session with deduplication and batching
   */
  async saveSession(sessionData: SessionData, authToken: string): Promise<void> {
    const sessionId = sessionData.id;

    // Check if already processed
    if (this.processedSessions.has(sessionId)) {
      console.log('⚠️ Session already saved:', sessionId);
      return;
    }

    // Check if currently being processed
    if (this.pendingSessions.has(sessionId)) {
      console.log('⚠️ Session save in progress, waiting:', sessionId);
      return this.pendingSessions.get(sessionId);
    }

    // Mark as processed immediately
    this.processedSessions.add(sessionId);

    // Create the save promise
    const savePromise = this.performSave(sessionData, authToken);
    this.pendingSessions.set(sessionId, savePromise);

    try {
      await savePromise;
      console.log('✅ Session saved successfully:', sessionId);
    } catch (error) {
      console.error('❌ Session save failed:', sessionId, error);
      // Remove from processed set on failure so it can be retried
      this.processedSessions.delete(sessionId);
      throw error;
    } finally {
      this.pendingSessions.delete(sessionId);
    }
  }

  /**
   * Perform the actual API call with circuit breaker and resilient fetch
   */
  private async performSave(sessionData: SessionData, authToken: string): Promise<void> {
    return studySessionCircuitBreaker.execute(async () => {
      const response = await resilientFetch('/api/user/study-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify(sessionData),
      }, {
        maxRetries: 2, // Reduced retries since circuit breaker handles this
        baseDelay: 2000,
        maxDelay: 8000
      });

      if (!response.ok) {
        const errorData = await response.text();
        let errorMessage = 'Failed to save study session';
        
        try {
          const errorObj = JSON.parse(errorData);
          errorMessage = errorObj.error || errorMessage;
        } catch {
          errorMessage = errorData || errorMessage;
        }
        
        throw new Error(`${response.status}: ${errorMessage}`);
      }

      return response.json();
    });
  }

  /**
   * Add session to batch queue (alternative approach)
   */
  queueSession(sessionData: SessionData, authToken: string): void {
    if (this.processedSessions.has(sessionData.id)) {
      return;
    }

    this.saveQueue.set(sessionData.id, sessionData);

    // Clear existing timeout
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }

    // Batch save after 2 seconds of inactivity
    this.saveTimeout = setTimeout(() => {
      this.processBatch(authToken);
    }, 2000);
  }

  /**
   * Process batched sessions
   */
  private async processBatch(authToken: string): Promise<void> {
    const sessions = Array.from(this.saveQueue.values());
    this.saveQueue.clear();

    if (sessions.length === 0) return;

    console.log(`📦 Processing batch of ${sessions.length} sessions`);

    // Process sessions in parallel with concurrency limit
    const concurrency = 3;
    for (let i = 0; i < sessions.length; i += concurrency) {
      const batch = sessions.slice(i, i + concurrency);
      await Promise.allSettled(
        batch.map(session => this.saveSession(session, authToken))
      );
    }
  }

  /**
   * Check if session is already processed
   */
  isProcessed(sessionId: string): boolean {
    return this.processedSessions.has(sessionId);
  }

  /**
   * Clear processed sessions (for testing/debugging)
   */
  clearProcessed(): void {
    this.processedSessions.clear();
    this.pendingSessions.clear();
    this.saveQueue.clear();
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
      this.saveTimeout = null;
    }
  }

  /**
   * Get statistics
   */
  getStats(): {
    processed: number;
    pending: number;
    queued: number;
  } {
    return {
      processed: this.processedSessions.size,
      pending: this.pendingSessions.size,
      queued: this.saveQueue.size,
    };
  }
}

// Export singleton instance
export const sessionSaver = SessionSaver.getInstance();

// Export types
export type { SessionData };