/**
 * Database health checker and connection recovery utility
 */

import { getDatabase } from './mongodb';

interface HealthCheckResult {
  isHealthy: boolean;
  latency: number;
  error?: string;
  timestamp: number;
}

class DatabaseHealthChecker {
  private static instance: DatabaseHealthChecker;
  private lastHealthCheck: HealthCheckResult | null = null;
  private healthCheckInterval: NodeJS.Timeout | null = null;

  private constructor() {}

  static getInstance(): DatabaseHealthChecker {
    if (!DatabaseHealthChecker.instance) {
      DatabaseHealthChecker.instance = new DatabaseHealthChecker();
    }
    return DatabaseHealthChecker.instance;
  }

  /**
   * Perform a health check on the database connection
   */
  async checkHealth(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    
    try {
      const db = await getDatabase();
      
      // Simple ping to test connection
      await db.admin().ping();
      
      const latency = Date.now() - startTime;
      
      const result: HealthCheckResult = {
        isHealthy: true,
        latency,
        timestamp: Date.now()
      };
      
      this.lastHealthCheck = result;
      return result;
      
    } catch (error) {
      const latency = Date.now() - startTime;
      
      const result: HealthCheckResult = {
        isHealthy: false,
        latency,
        error: error instanceof Error ? error.message : 'Unknown database error',
        timestamp: Date.now()
      };
      
      this.lastHealthCheck = result;
      console.error('Database health check failed:', result);
      return result;
    }
  }

  /**
   * Get the last health check result
   */
  getLastHealthCheck(): HealthCheckResult | null {
    return this.lastHealthCheck;
  }

  /**
   * Start periodic health checks
   */
  startPeriodicHealthChecks(intervalMs: number = 30000): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }

    this.healthCheckInterval = setInterval(async () => {
      await this.checkHealth();
    }, intervalMs);

    // Perform initial health check
    this.checkHealth();
  }

  /**
   * Stop periodic health checks
   */
  stopPeriodicHealthChecks(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
  }

  /**
   * Check if database is currently healthy
   */
  isHealthy(): boolean {
    if (!this.lastHealthCheck) return false;
    
    // Consider stale if older than 2 minutes
    const isStale = Date.now() - this.lastHealthCheck.timestamp > 120000;
    
    return this.lastHealthCheck.isHealthy && !isStale;
  }

  /**
   * Wait for database to become healthy
   */
  async waitForHealthy(timeoutMs: number = 30000): Promise<boolean> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeoutMs) {
      const health = await this.checkHealth();
      
      if (health.isHealthy) {
        return true;
      }
      
      // Wait 2 seconds before next check
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    return false;
  }
}

// Export singleton instance
export const dbHealthChecker = DatabaseHealthChecker.getInstance();

// Auto-start health checks in production
if (process.env.NODE_ENV === 'production') {
  dbHealthChecker.startPeriodicHealthChecks();
}