/**
 * Production-Ready MongoDB Connection Manager for Atlas M0 Tier
 * Manages connections with 15-minute system-wide inactivity threshold
 * Deployment-optimized for Vercel and production environments
 */

import { MongoClient } from 'mongodb';

interface ConnectionTracker {
  client: MongoClient;
  lastUsed: number;
  isActive: boolean;
  requestCount: number;
  connectionId: string;
}

interface SystemActivity {
  lastActivity: number;
  totalRequests: number;
  cleanupStarted: boolean;
}

class AggressiveConnectionManager {
  private static instance: AggressiveConnectionManager;
  private connections = new Map<string, ConnectionTracker>();
  private cleanupInterval: NodeJS.Timeout | null = null;
  private systemActivity: SystemActivity = {
    lastActivity: Date.now(),
    totalRequests: 0,
    cleanupStarted: false
  };
  
  // Production-optimized timeouts for faster response
  private readonly SYSTEM_INACTIVITY_THRESHOLD = 900000; // 15 minutes system-wide inactivity
  private readonly CONNECTION_IDLE_TIMEOUT = 600000; // 10 minutes per connection after system cleanup starts
  private readonly CLEANUP_CHECK_INTERVAL = 120000; // Check every 2 minutes (faster response)
  private readonly MAX_CONNECTIONS_M0 = 3; // Conservative limit for M0 tier
  private readonly CONNECTION_TIMEOUT = 10000; // 10 second timeout for faster response
  private readonly FORCE_CLEANUP_THRESHOLD = 5; // Force cleanup if more than 5 connections
  private readonly PING_TIMEOUT = 3000; // 3 second ping timeout for faster health checks
  private listenersRegistered = false;

  private constructor() {
    this.startPeriodicCleanup();
    this.registerProcessListeners();
    
    // Initialize system activity tracking
    this.systemActivity.lastActivity = Date.now();
    this.systemActivity.totalRequests = 0;
    this.systemActivity.cleanupStarted = false;
  }

  private registerProcessListeners(): void {
    if (this.listenersRegistered) return;
    
    // Production-safe listener management
    const currentListeners = process.listenerCount('beforeExit') + 
                           process.listenerCount('SIGINT') + 
                           process.listenerCount('SIGTERM');
    
    if (currentListeners < 10) {
      process.setMaxListeners(Math.max(15, currentListeners + 5));
    }
    
    // Graceful shutdown handler
    const gracefulShutdown = async () => {
      try {
        await this.closeAllConnections();
      } catch (error) {
        // Log error but don't throw during shutdown
        if (process.env.NODE_ENV === 'development') {
          console.error('Error during connection cleanup:', error);
        }
      }
    };
    
    // Register shutdown handlers only once
    if (!this.listenersRegistered) {
      process.once('beforeExit', gracefulShutdown);
      process.once('SIGINT', gracefulShutdown);
      process.once('SIGTERM', gracefulShutdown);
      
      // Vercel-specific shutdown handling
      if (process.env.VERCEL) {
        process.once('SIGKILL', gracefulShutdown);
      }
      
      this.listenersRegistered = true;
    }
  }

  static getInstance(): AggressiveConnectionManager {
    if (!AggressiveConnectionManager.instance) {
      AggressiveConnectionManager.instance = new AggressiveConnectionManager();
    }
    return AggressiveConnectionManager.instance;
  }

  /**
   * Get or create a connection with system-wide activity tracking
   * Only starts aggressive cleanup after 15 minutes of system inactivity
   */
  async getConnection(uri: string, options: Record<string, unknown>): Promise<MongoClient> {
    // Update system activity tracking
    this.updateSystemActivity();
    
    const connectionId = this.generateConnectionId(uri);
    
    // Check if we have an existing active connection
    const existing = this.connections.get(connectionId);
    if (existing && existing.isActive) {
      try {
        // Test if connection is still alive with faster timeout
        await Promise.race([
          existing.client.db().admin().ping(),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Ping timeout')), this.PING_TIMEOUT)
          )
        ]);
        
        existing.lastUsed = Date.now();
        existing.requestCount++;
        this.updateSystemActivity();
        return existing.client;
      } catch {
        // Connection is dead, remove it safely
        await this.safeCloseConnection(connectionId);
      }
    }

    // Enforce strict connection limit for M0 tier
    if (this.connections.size >= this.MAX_CONNECTIONS_M0) {
      await this.forceCleanupForNewConnection();
    }

    // Create new connection with production-optimized settings
    const client = new MongoClient(uri, {
      ...options,
      serverSelectionTimeoutMS: this.CONNECTION_TIMEOUT,
      connectTimeoutMS: this.CONNECTION_TIMEOUT,
      socketTimeoutMS: 20000, // Optimized for faster response
      heartbeatFrequencyMS: 20000, // More frequent heartbeat for faster detection
      maxPoolSize: 1, // Single connection per client for M0
      minPoolSize: 0,
      maxIdleTimeMS: this.CONNECTION_IDLE_TIMEOUT,
    });

    try {
      // Connect with timeout and retry logic
      await this.connectWithRetry(client);

      // Verify connection health
      await client.db().admin().ping();

      // Track the connection with full metadata
      this.connections.set(connectionId, {
        client,
        lastUsed: Date.now(),
        isActive: true,
        requestCount: 1,
        connectionId
      });

      // Log only in development or when debugging
      if (process.env.NODE_ENV === 'development' || process.env.DEBUG_CONNECTIONS) {
        console.warn(`📡 New MongoDB connection: ${connectionId} (Total: ${this.connections.size})`);
      }
      
      return client;
    } catch (error) {
      // Ensure client is properly closed on failure
      await this.safeCloseClient(client);
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown connection error';
      console.error(`❌ MongoDB connection failed: ${errorMessage}`);
      
      // Throw user-friendly error for production
      throw new Error('Database connection temporarily unavailable. Please try again.');
    }
  }

  /**
   * Connect with retry logic for production reliability
   */
  private async connectWithRetry(client: MongoClient, maxRetries = 2): Promise<void> {
    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        await Promise.race([
          client.connect(),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Connection timeout')), this.CONNECTION_TIMEOUT)
          )
        ]);
        return; // Success
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Connection failed');
        
        if (attempt < maxRetries) {
          // Wait before retry with exponential backoff
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        }
      }
    }
    
    throw lastError || new Error('Connection failed after retries');
  }

  /**
   * Update system-wide activity tracking and immediately stop cleanup if active
   */
  private updateSystemActivity(): void {
    const wasInCleanup = this.systemActivity.cleanupStarted;
    
    this.systemActivity.lastActivity = Date.now();
    this.systemActivity.totalRequests++;
    
    // Immediately stop cleanup if system becomes active again
    if (this.systemActivity.cleanupStarted) {
      this.systemActivity.cleanupStarted = false;
      
      // Log activity detection during cleanup in development
      if (process.env.NODE_ENV === 'development' && wasInCleanup) {
        console.warn('🔄 User activity detected - stopping connection cleanup');
      }
    }
  }

  /**
   * Check if system has been inactive for 15 minutes
   */
  private isSystemInactive(): boolean {
    const inactiveTime = Date.now() - this.systemActivity.lastActivity;
    return inactiveTime > this.SYSTEM_INACTIVITY_THRESHOLD;
  }

  /**
   * Check if cleanup should be interrupted due to new activity
   */
  private shouldInterruptCleanup(): boolean {
    // If cleanup was started but system is no longer inactive, interrupt
    return this.systemActivity.cleanupStarted && !this.isSystemInactive();
  }

  /**
   * Force cleanup to make room for new connection
   */
  private async forceCleanupForNewConnection(): Promise<void> {
    const oldestConnections = Array.from(this.connections.entries())
      .sort(([, a], [, b]) => a.lastUsed - b.lastUsed)
      .slice(0, Math.max(1, this.connections.size - this.MAX_CONNECTIONS_M0 + 1));

    for (const [connectionId] of oldestConnections) {
      await this.safeCloseConnection(connectionId);
    }
  }

  /**
   * Mark connection as used and update system activity
   */
  markConnectionUsed(client: MongoClient): void {
    this.updateSystemActivity();
    
    for (const [, tracker] of this.connections.entries()) {
      if (tracker.client === client) {
        tracker.lastUsed = Date.now();
        tracker.requestCount++;
        break;
      }
    }
  }

  /**
   * Start periodic cleanup process with system inactivity awareness
   */
  private startPeriodicCleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    this.cleanupInterval = setInterval(async () => {
      try {
        await this.performIntelligentCleanup();
      } catch (error) {
        // Log error but don't crash the cleanup process
        if (process.env.NODE_ENV === 'development') {
          console.error('Cleanup process error:', error);
        }
      }
    }, this.CLEANUP_CHECK_INTERVAL);
  }

  /**
   * Intelligent cleanup that only acts after 15 minutes of system inactivity
   */
  private async performIntelligentCleanup(): Promise<void> {
    const now = Date.now();
    const systemInactive = this.isSystemInactive();
    
    // Only start aggressive cleanup after 15 minutes of system inactivity
    if (!systemInactive && !this.systemActivity.cleanupStarted) {
      // System is still active, only do minimal maintenance
      await this.performMinimalMaintenance();
      return;
    }

    // Mark that cleanup has started due to inactivity
    if (systemInactive && !this.systemActivity.cleanupStarted) {
      this.systemActivity.cleanupStarted = true;
      if (process.env.NODE_ENV === 'development') {
        console.warn('🧹 Starting connection cleanup after 15 minutes of inactivity');
      }
    }

    // Perform aggressive cleanup
    await this.performAggressiveCleanup(now);
  }

  /**
   * Minimal maintenance for active systems
   */
  private async performMinimalMaintenance(): Promise<void> {
    // Only close obviously dead connections
    const deadConnections: string[] = [];
    
    for (const [connectionId, tracker] of this.connections.entries()) {
      try {
        // Quick health check with optimized timeout
        await Promise.race([
          tracker.client.db().admin().ping(),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Health check timeout')), this.PING_TIMEOUT)
          )
        ]);
      } catch {
        // Connection is dead
        deadConnections.push(connectionId);
      }
    }

    // Close dead connections
    for (const connectionId of deadConnections) {
      await this.safeCloseConnection(connectionId);
    }
  }

  /**
   * Aggressive cleanup after system inactivity threshold - with interruption support
   */
  private async performAggressiveCleanup(now: number): Promise<void> {
    const connectionsToClose: string[] = [];

    // Identify connections to close based on individual idle time
    for (const [connectionId, tracker] of this.connections.entries()) {
      // Check for interruption before processing each connection
      if (this.shouldInterruptCleanup()) {
        if (process.env.NODE_ENV === 'development') {
          console.warn('🔄 Cleanup interrupted by user activity');
        }
        return;
      }

      const connectionIdleTime = now - tracker.lastUsed;
      
      // Close connections idle for more than 10 minutes during cleanup phase
      if (connectionIdleTime > this.CONNECTION_IDLE_TIMEOUT) {
        connectionsToClose.push(connectionId);
      }
    }

    // Close idle connections with interruption checks
    for (const connectionId of connectionsToClose) {
      // Check for interruption before closing each connection
      if (this.shouldInterruptCleanup()) {
        if (process.env.NODE_ENV === 'development') {
          console.warn('🔄 Cleanup interrupted during connection closure');
        }
        return;
      }
      
      await this.safeCloseConnection(connectionId);
    }

    // If still too many connections, close oldest ones (with interruption checks)
    if (this.connections.size > this.MAX_CONNECTIONS_M0 && !this.shouldInterruptCleanup()) {
      const sortedConnections = Array.from(this.connections.entries())
        .sort(([, a], [, b]) => a.lastUsed - b.lastUsed);
      
      const excessCount = this.connections.size - this.MAX_CONNECTIONS_M0;
      for (let i = 0; i < excessCount; i++) {
        // Check for interruption before closing each excess connection
        if (this.shouldInterruptCleanup()) {
          if (process.env.NODE_ENV === 'development') {
            console.warn('🔄 Cleanup interrupted during excess connection removal');
          }
          return;
        }
        
        const [connectionId] = sortedConnections[i];
        await this.safeCloseConnection(connectionId);
      }
    }

    // Log cleanup status in development (only if not interrupted)
    if (process.env.NODE_ENV === 'development' && connectionsToClose.length > 0 && !this.shouldInterruptCleanup()) {
      const inactiveMinutes = Math.round((now - this.systemActivity.lastActivity) / 60000);
      console.warn(`🧹 Cleanup completed: ${connectionsToClose.length} closed, ${this.connections.size} remaining (inactive for ${inactiveMinutes}m)`);
    }
  }

  /**
   * Safely close a specific connection with error handling
   */
  private async safeCloseConnection(connectionId: string): Promise<void> {
    const tracker = this.connections.get(connectionId);
    if (!tracker) return;

    try {
      // Set connection as inactive immediately
      tracker.isActive = false;
      
      // Close with timeout to prevent hanging
      await Promise.race([
        tracker.client.close(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Close timeout')), 5000)
        )
      ]);
      
      this.connections.delete(connectionId);
      
      if (process.env.NODE_ENV === 'development') {
        const idleMinutes = Math.round((Date.now() - tracker.lastUsed) / 60000);
        console.warn(`🔌 Connection closed: ${connectionId} (idle: ${idleMinutes}m, requests: ${tracker.requestCount})`);
      }
    } catch (error) {
      // Log warning but continue cleanup
      if (process.env.NODE_ENV === 'development') {
        console.warn(`⚠️ Error closing connection ${connectionId}:`, error);
      }
      
      // Remove from tracking even if close failed
      this.connections.delete(connectionId);
    }
  }

  /**
   * Safely close a client with error handling
   */
  private async safeCloseClient(client: MongoClient): Promise<void> {
    try {
      await Promise.race([
        client.close(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Close timeout')), 3000)
        )
      ]);
    } catch {
      // Ignore close errors for failed connections
    }
  }

  /**
   * Close all connections safely with production-grade error handling
   */
  async closeAllConnections(): Promise<void> {
    if (process.env.NODE_ENV === 'development') {
      console.warn('🔌 Gracefully closing all database connections...');
    }
    
    // Stop the cleanup interval first
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    
    // Close all connections with individual timeouts
    const closePromises = Array.from(this.connections.keys()).map(connectionId => 
      Promise.race([
        this.safeCloseConnection(connectionId),
        new Promise<void>(resolve => setTimeout(resolve, 3000)) // 3 second timeout per connection
      ])
    );
    
    // Wait for all closures to complete or timeout
    const results = await Promise.allSettled(closePromises);
    
    // Log any failures in development
    if (process.env.NODE_ENV === 'development') {
      const failures = results.filter(result => result.status === 'rejected').length;
      if (failures > 0) {
        console.warn(`⚠️ ${failures} connections failed to close gracefully`);
      }
    }
    
    // Force clear the connections map
    this.connections.clear();
    
    // Reset system activity
    this.systemActivity = {
      lastActivity: Date.now(),
      totalRequests: 0,
      cleanupStarted: false
    };
  }

  /**
   * Get comprehensive connection and system statistics
   */
  getStats(): {
    totalConnections: number;
    activeConnections: number;
    idleConnections: number;
    oldestConnection: number;
    systemInactiveTime: number;
    cleanupActive: boolean;
    totalRequests: number;
    averageRequestsPerConnection: number;
  } {
    const now = Date.now();
    let activeCount = 0;
    let oldestTime = 0;
    let totalRequests = 0;

    for (const tracker of this.connections.values()) {
      if (tracker.isActive) {
        activeCount++;
      }
      const age = now - tracker.lastUsed;
      if (age > oldestTime) {
        oldestTime = age;
      }
      totalRequests += tracker.requestCount;
    }

    return {
      totalConnections: this.connections.size,
      activeConnections: activeCount,
      idleConnections: this.connections.size - activeCount,
      oldestConnection: oldestTime,
      systemInactiveTime: now - this.systemActivity.lastActivity,
      cleanupActive: this.systemActivity.cleanupStarted,
      totalRequests: this.systemActivity.totalRequests,
      averageRequestsPerConnection: this.connections.size > 0 ? totalRequests / this.connections.size : 0
    };
  }

  /**
   * Force immediate cleanup regardless of system activity
   */
  async forceCleanup(): Promise<void> {
    if (process.env.NODE_ENV === 'development') {
      console.warn('🧹 Forcing immediate connection cleanup...');
    }
    
    // Temporarily mark cleanup as started to trigger aggressive cleanup
    const originalCleanupState = this.systemActivity.cleanupStarted;
    this.systemActivity.cleanupStarted = true;
    
    try {
      await this.performAggressiveCleanup(Date.now());
    } finally {
      // Restore original cleanup state
      this.systemActivity.cleanupStarted = originalCleanupState;
    }
  }

  /**
   * Get real-time activity status
   */
  getActivityStatus(): {
    isActive: boolean;
    inactiveTime: number;
    cleanupActive: boolean;
    lastActivity: Date;
    totalRequests: number;
  } {
    const now = Date.now();
    return {
      isActive: !this.isSystemInactive(),
      inactiveTime: now - this.systemActivity.lastActivity,
      cleanupActive: this.systemActivity.cleanupStarted,
      lastActivity: new Date(this.systemActivity.lastActivity),
      totalRequests: this.systemActivity.totalRequests
    };
  }

  /**
   * Health check for monitoring and debugging
   */
  async healthCheck(): Promise<{
    healthy: boolean;
    connectionCount: number;
    systemInactive: boolean;
    errors: string[];
  }> {
    const errors: string[] = [];

    // Test each connection
    for (const [connectionId, tracker] of this.connections.entries()) {
      try {
        await Promise.race([
          tracker.client.db().admin().ping(),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Health check timeout')), this.PING_TIMEOUT)
          )
        ]);
      } catch (error) {
        errors.push(`Connection ${connectionId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    return {
      healthy: errors.length === 0 && this.connections.size <= this.MAX_CONNECTIONS_M0,
      connectionCount: this.connections.size,
      systemInactive: this.isSystemInactive(),
      errors
    };
  }

  /**
   * Generate connection ID from URI
   */
  private generateConnectionId(uri: string): string {
    // Create a simple hash of the URI for identification
    return Buffer.from(uri).toString('base64').substring(0, 8);
  }
}

// Export singleton instance
export const aggressiveConnectionManager = AggressiveConnectionManager.getInstance();

// Production-ready initialization
if (typeof process !== 'undefined' && process.env.NODE_ENV) {
  // Conservative cleanup schedule for production stability
  const cleanupInterval = process.env.NODE_ENV === 'production' ? 600000 : 300000; // 10min prod, 5min dev
  
  // Health monitoring for production
  if (process.env.NODE_ENV === 'production') {
    const healthCheckInterval = setInterval(async () => {
      try {
        const health = await aggressiveConnectionManager.healthCheck();
        if (!health.healthy && health.errors.length > 0) {
          console.error('MongoDB connection health issues detected:', health.errors);
          // Force cleanup if unhealthy
          await aggressiveConnectionManager.forceCleanup();
        }
      } catch (error) {
        console.error('Health check failed:', error);
      }
    }, 300000); // Every 5 minutes in production
    
    // Clear health check on exit
    process.once('beforeExit', () => {
      clearInterval(healthCheckInterval);
    });
  }
  
  // Periodic maintenance (less aggressive than before)
  const maintenanceTimer = setInterval(() => {
    aggressiveConnectionManager.forceCleanup().catch(error => {
      // Log error but don't crash
      if (process.env.NODE_ENV === 'development') {
        console.error('Maintenance cleanup failed:', error);
      }
    });
  }, cleanupInterval);
  
  // Graceful shutdown
  const shutdown = () => {
    clearInterval(maintenanceTimer);
    aggressiveConnectionManager.closeAllConnections().catch(() => {
      // Ignore errors during shutdown
    });
  };
  
  process.once('beforeExit', shutdown);
  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);
}