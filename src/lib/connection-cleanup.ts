/**
 * Connection cleanup utilities for MongoDB Atlas M0 tier
 */

import { getDatabase } from './mongodb';

class ConnectionManager {
  private static instance: ConnectionManager;
  private cleanupInterval: NodeJS.Timeout | null = null;
  private isCleanupRunning = false;

  private constructor() {}

  static getInstance(): ConnectionManager {
    if (!ConnectionManager.instance) {
      ConnectionManager.instance = new ConnectionManager();
    }
    return ConnectionManager.instance;
  }

  /**
   * Start periodic connection cleanup
   */
  startCleanup(intervalMs: number = 30000): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    this.cleanupInterval = setInterval(async () => {
      await this.performCleanup();
    }, intervalMs);

    // Perform initial cleanup
    this.performCleanup();
  }

  /**
   * Stop periodic cleanup
   */
  stopCleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  /**
   * Perform connection cleanup
   */
  private async performCleanup(): Promise<void> {
    if (this.isCleanupRunning) return;
    
    this.isCleanupRunning = true;
    
    try {
      const db = await getDatabase();
      
      // Check server status for connection monitoring
      try {
        const serverStatus = await db.admin().serverStatus();
        const connections = serverStatus.connections;
        const usagePercent = ((connections.current / (connections.current + connections.available)) * 100).toFixed(1);
        
        if (parseFloat(usagePercent) > 70) {
          console.warn(`⚠️ High connection usage: ${usagePercent}%`);
        }
      } catch {
        // Skip admin operations if not permitted - admin access not available
      }



    } catch {
      // Silently handle cleanup errors in production
    } finally {
      this.isCleanupRunning = false;
    }
  }

  /**
   * Get connection statistics
   */
  async getConnectionStats(): Promise<{
    current: number;
    available: number;
    usagePercent: number;
  }> {
    try {
      const db = await getDatabase();
      const serverStatus = await db.admin().serverStatus();
      const connections = serverStatus.connections;
      
      const usagePercent = ((connections.current / (connections.current + connections.available)) * 100);
      
      return {
        current: connections.current,
        available: connections.available,
        usagePercent: parseFloat(usagePercent.toFixed(1))
      };
    } catch {
      return {
        current: 0,
        available: 0,
        usagePercent: 0
      };
    }
  }
}

// Export singleton instance
export const connectionManager = ConnectionManager.getInstance();

// Auto-start cleanup in production
if (process.env.NODE_ENV === 'production') {
  connectionManager.startCleanup(60000); // Every minute in production
} else if (process.env.NODE_ENV === 'development') {
  connectionManager.startCleanup(30000); // Every 30 seconds in development
}