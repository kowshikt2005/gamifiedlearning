import { MongoClient, Db } from 'mongodb';
import { aggressiveConnectionManager } from './aggressive-connection-manager';

if (!process.env.MONGODB_URI) {
  throw new Error('Please add your MongoDB URI to .env.local');
}

const uri = process.env.MONGODB_URI;
const options = {
  // Production-optimized for MongoDB Atlas M0 tier - faster response times
  maxPoolSize: 3, // Conservative limit for M0 tier (max 10 connections total)
  minPoolSize: 0, // No minimum to allow complete cleanup
  maxIdleTimeMS: 240000, // Close idle connections after 4 minutes (faster cleanup)
  serverSelectionTimeoutMS: 10000, // Reduced timeout for faster response
  socketTimeoutMS: 20000, // Reduced socket timeout for faster response
  connectTimeoutMS: 10000, // Reduced connect timeout for faster response
  heartbeatFrequencyMS: 20000, // More frequent heartbeat (20 seconds)
  retryWrites: true,
  retryReads: true,
  maxConnecting: 1, // Only 1 connection attempt at a time
  waitQueueTimeoutMS: 3000, // Reduced wait time for faster response
  compressors: ['zlib'], // Reduce bandwidth usage
  // Note: bufferMaxEntries and bufferCommands are deprecated and removed
};

// Use aggressive connection manager for automatic cleanup
const getClient = async (): Promise<MongoClient> => {
  return aggressiveConnectionManager.getConnection(uri, options);
};

const clientPromise: Promise<MongoClient> = getClient();

export default clientPromise;

export async function getDatabase(): Promise<Db> {
  const maxRetries = 3;
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // Only force cleanup on retry attempts, not first attempt
      if (attempt > 1) {
        await aggressiveConnectionManager.forceCleanup();
        // Exponential backoff for retries
        await new Promise(resolve => setTimeout(resolve, Math.min(1000 * Math.pow(2, attempt - 1), 5000)));
      }
      
      const client = await aggressiveConnectionManager.getConnection(uri, options);
      const db = client.db('studymaster');
      
      // Test the connection with faster timeout
      await Promise.race([
        db.admin().ping(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Database ping timeout')), 5000)
        )
      ]);
      
      // Mark connection as used for activity tracking
      aggressiveConnectionManager.markConnectionUsed(client);
      
      return db;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Unknown connection error');
      
      // Log detailed error in development, generic in production
      if (process.env.NODE_ENV === 'development') {
        console.error(`MongoDB connection attempt ${attempt}/${maxRetries} failed:`, lastError.message);
      } else if (attempt === maxRetries) {
        console.error('Database connection failed after all retries');
      }
      
      if (attempt === maxRetries) {
        break;
      }
    }
  }
  
  // All connection attempts failed - throw user-friendly error
  throw new Error('Database temporarily unavailable. Please try again in a moment.');
}

// Atlas connection validation with health monitoring
export async function validateAtlasConnection(): Promise<void> {
  try {
    const client = await aggressiveConnectionManager.getConnection(uri, options);
    
    // Test connection with faster timeout
    await Promise.race([
      client.db('admin').command({ ping: 1 }),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Atlas validation timeout')), 8000)
      )
    ]);
    
    // Mark as used
    aggressiveConnectionManager.markConnectionUsed(client);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Atlas connection validation failed:', errorMessage);
    throw new Error('Failed to connect to MongoDB Atlas');
  }
}

// Health check function for monitoring
export async function getDatabaseHealth(): Promise<{
  connected: boolean;
  connectionStats: ReturnType<typeof aggressiveConnectionManager.getStats>;
  error?: string;
}> {
  try {
    const health = await aggressiveConnectionManager.healthCheck();
    const stats = aggressiveConnectionManager.getStats();
    
    return {
      connected: health.healthy,
      connectionStats: stats,
      error: health.errors.length > 0 ? health.errors.join('; ') : undefined
    };
  } catch (error) {
    return {
      connected: false,
      connectionStats: aggressiveConnectionManager.getStats(),
      error: error instanceof Error ? error.message : 'Health check failed'
    };
  }
}