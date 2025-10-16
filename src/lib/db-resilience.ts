/**
 * Database resilience utilities for handling connection issues
 */

import { getDatabase } from './mongodb';
import { dbHealthChecker } from './db-health-checker';

interface RetryOptions {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
}

const defaultRetryOptions: RetryOptions = {
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 10000,
  backoffMultiplier: 2
};

/**
 * Execute a database operation with automatic retry and circuit breaker
 */
export async function withDatabaseResilience<T>(
  operation: () => Promise<T>,
  options: Partial<RetryOptions> = {}
): Promise<T> {
  const config = { ...defaultRetryOptions, ...options };
  let lastError: Error | undefined;

  for (let attempt = 1; attempt <= config.maxRetries; attempt++) {
    try {
      // Check if database is healthy before attempting operation
      if (attempt > 1) {
        const isHealthy = await dbHealthChecker.waitForHealthy(5000);
        if (!isHealthy) {
          throw new Error('Database is not healthy after waiting');
        }
      }

      return await operation();
      
    } catch (error) {
      lastError = error as Error;
      
      console.warn(`Database operation failed (attempt ${attempt}/${config.maxRetries}):`, {
        error: lastError.message,
        attempt,
        willRetry: attempt < config.maxRetries
      });

      // Don't retry on certain errors
      if (isNonRetryableError(lastError)) {
        throw lastError;
      }

      // If this was the last attempt, throw the error
      if (attempt === config.maxRetries) {
        break;
      }

      // Calculate delay with exponential backoff
      const delay = Math.min(
        config.baseDelay * Math.pow(config.backoffMultiplier, attempt - 1),
        config.maxDelay
      );

      console.log(`Retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  // All retries exhausted
  throw new Error(`Database operation failed after ${config.maxRetries} attempts: ${lastError?.message || 'Unknown error'}`);
}

/**
 * Check if an error should not be retried
 */
function isNonRetryableError(error: Error): boolean {
  const nonRetryablePatterns = [
    'authentication failed',
    'unauthorized',
    'invalid credentials',
    'duplicate key error',
    'validation failed'
  ];

  const errorMessage = error.message.toLowerCase();
  return nonRetryablePatterns.some(pattern => errorMessage.includes(pattern));
}

/**
 * Wrapper for database operations with automatic resilience
 */
export class ResilientDatabase {
  private static instance: ResilientDatabase;

  private constructor() {}

  static getInstance(): ResilientDatabase {
    if (!ResilientDatabase.instance) {
      ResilientDatabase.instance = new ResilientDatabase();
    }
    return ResilientDatabase.instance;
  }

  /**
   * Execute a database operation with resilience
   */
  async execute<T>(operation: () => Promise<T>): Promise<T> {
    return withDatabaseResilience(operation);
  }

  /**
   * Get database with resilience
   */
  async getDatabase() {
    return withDatabaseResilience(() => getDatabase());
  }

  /**
   * Find documents with resilience
   */
  async findOne(collectionName: string, query: any) {
    return withDatabaseResilience(async () => {
      const db = await getDatabase();
      return db.collection(collectionName).findOne(query);
    });
  }

  /**
   * Find multiple documents with resilience
   */
  async find(collectionName: string, query: any, options?: any) {
    return withDatabaseResilience(async () => {
      const db = await getDatabase();
      return db.collection(collectionName).find(query, options).toArray();
    });
  }

  /**
   * Insert document with resilience
   */
  async insertOne(collectionName: string, document: any) {
    return withDatabaseResilience(async () => {
      const db = await getDatabase();
      return db.collection(collectionName).insertOne(document);
    });
  }

  /**
   * Update document with resilience
   */
  async updateOne(collectionName: string, filter: any, update: any, options?: any) {
    return withDatabaseResilience(async () => {
      const db = await getDatabase();
      return db.collection(collectionName).updateOne(filter, update, options);
    });
  }

  /**
   * Delete document with resilience
   */
  async deleteOne(collectionName: string, filter: any) {
    return withDatabaseResilience(async () => {
      const db = await getDatabase();
      return db.collection(collectionName).deleteOne(filter);
    });
  }

  /**
   * Count documents with resilience
   */
  async countDocuments(collectionName: string, query: any = {}) {
    return withDatabaseResilience(async () => {
      const db = await getDatabase();
      return db.collection(collectionName).countDocuments(query);
    });
  }

  /**
   * Aggregate with resilience
   */
  async aggregate(collectionName: string, pipeline: any[]) {
    return withDatabaseResilience(async () => {
      const db = await getDatabase();
      return db.collection(collectionName).aggregate(pipeline).toArray();
    });
  }
}

// Export singleton instance
export const resilientDb = ResilientDatabase.getInstance();