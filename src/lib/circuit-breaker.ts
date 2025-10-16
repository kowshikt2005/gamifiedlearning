/**
 * Circuit breaker pattern to prevent API overload
 * Automatically stops requests when failure rate is too high
 */

interface CircuitBreakerOptions {
  failureThreshold: number;
  resetTimeout: number;
  monitoringPeriod: number;
}

enum CircuitState {
  CLOSED = 'CLOSED',     // Normal operation
  OPEN = 'OPEN',         // Blocking requests
  HALF_OPEN = 'HALF_OPEN' // Testing if service recovered
}

interface RequestRecord {
  timestamp: number;
  success: boolean;
}

export class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private failureCount = 0;
  private lastFailureTime = 0;
  private requestHistory: RequestRecord[] = [];
  
  constructor(private options: CircuitBreakerOptions) {}

  /**
   * Execute a function with circuit breaker protection
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === CircuitState.OPEN) {
      if (this.shouldAttemptReset()) {
        this.state = CircuitState.HALF_OPEN;
      } else {
        throw new Error('Circuit breaker is OPEN - service unavailable');
      }
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  /**
   * Record successful request
   */
  private onSuccess(): void {
    this.recordRequest(true);
    this.failureCount = 0;
    
    if (this.state === CircuitState.HALF_OPEN) {
      this.state = CircuitState.CLOSED;
    }
  }

  /**
   * Record failed request
   */
  private onFailure(): void {
    this.recordRequest(false);
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.failureCount >= this.options.failureThreshold) {
      this.state = CircuitState.OPEN;
    }
  }

  /**
   * Record request in history
   */
  private recordRequest(success: boolean): void {
    const now = Date.now();
    this.requestHistory.push({ timestamp: now, success });
    
    // Clean old records
    const cutoff = now - this.options.monitoringPeriod;
    this.requestHistory = this.requestHistory.filter(
      record => record.timestamp > cutoff
    );
  }

  /**
   * Check if we should attempt to reset the circuit
   */
  private shouldAttemptReset(): boolean {
    return Date.now() - this.lastFailureTime >= this.options.resetTimeout;
  }

  /**
   * Get current circuit breaker state
   */
  getState(): CircuitState {
    return this.state;
  }

  /**
   * Get failure rate in the monitoring period
   */
  getFailureRate(): number {
    if (this.requestHistory.length === 0) return 0;
    
    const failures = this.requestHistory.filter(r => !r.success).length;
    return failures / this.requestHistory.length;
  }

  /**
   * Get statistics
   */
  getStats(): {
    state: CircuitState;
    failureCount: number;
    failureRate: number;
    totalRequests: number;
  } {
    return {
      state: this.state,
      failureCount: this.failureCount,
      failureRate: this.getFailureRate(),
      totalRequests: this.requestHistory.length,
    };
  }

  /**
   * Manually reset the circuit breaker
   */
  reset(): void {
    this.state = CircuitState.CLOSED;
    this.failureCount = 0;
    this.lastFailureTime = 0;
    this.requestHistory = [];
  }
}

// Create circuit breaker instances for different services
export const studySessionCircuitBreaker = new CircuitBreaker({
  failureThreshold: 5,      // Open after 5 failures
  resetTimeout: 60000,      // Try again after 1 minute
  monitoringPeriod: 300000, // Monitor last 5 minutes
});

export const apiCircuitBreaker = new CircuitBreaker({
  failureThreshold: 10,     // Open after 10 failures
  resetTimeout: 30000,      // Try again after 30 seconds
  monitoringPeriod: 180000, // Monitor last 3 minutes
});