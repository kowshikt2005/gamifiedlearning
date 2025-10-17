/**
 * Performance monitoring utilities for API endpoints and database queries
 */

interface PerformanceMetric {
  name: string;
  duration: number;
  timestamp: number;
  metadata?: Record<string, unknown>;
}

class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private readonly maxMetrics = 1000; // Keep last 1000 metrics
  private readonly slowThreshold = 1000; // 1 second

  /**
   * Start timing an operation
   */
  startTimer(name: string): (metadata?: Record<string, any>) => PerformanceMetric {
    const startTime = Date.now();
    
    return (metadata?: Record<string, unknown>) => {
      const duration = Date.now() - startTime;
      const metric: PerformanceMetric = {
        name,
        duration,
        timestamp: startTime,
        metadata
      };

      this.addMetric(metric);
      
      // Log slow operations
      if (duration > this.slowThreshold) {
        console.warn(`🐌 Slow operation: ${name} took ${duration}ms`, metadata);
      }

      return metric;
    };
  }

  /**
   * Time a function execution
   */
  async timeFunction<T>(
    name: string,
    fn: () => Promise<T>,
    metadata?: Record<string, unknown>
  ): Promise<T> {
    const endTimer = this.startTimer(name);
    
    try {
      const result = await fn();
      endTimer({ ...metadata, success: true });
      return result;
    } catch (error) {
      endTimer({ 
        ...metadata, 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      throw error;
    }
  }

  /**
   * Add a metric to the collection
   */
  private addMetric(metric: PerformanceMetric): void {
    this.metrics.push(metric);
    
    // Keep only the most recent metrics
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics);
    }
  }

  /**
   * Get performance statistics
   */
  getStats(name?: string): {
    count: number;
    averageDuration: number;
    minDuration: number;
    maxDuration: number;
    slowOperations: number;
  } {
    const filteredMetrics = name 
      ? this.metrics.filter(m => m.name === name)
      : this.metrics;

    if (filteredMetrics.length === 0) {
      return {
        count: 0,
        averageDuration: 0,
        minDuration: 0,
        maxDuration: 0,
        slowOperations: 0
      };
    }

    const durations = filteredMetrics.map(m => m.duration);
    const slowOperations = filteredMetrics.filter(m => m.duration > this.slowThreshold).length;

    return {
      count: filteredMetrics.length,
      averageDuration: durations.reduce((a, b) => a + b, 0) / durations.length,
      minDuration: Math.min(...durations),
      maxDuration: Math.max(...durations),
      slowOperations
    };
  }

  /**
   * Get recent slow operations
   */
  getSlowOperations(limit = 10): PerformanceMetric[] {
    return this.metrics
      .filter(m => m.duration > this.slowThreshold)
      .sort((a, b) => b.duration - a.duration)
      .slice(0, limit);
  }

  /**
   * Clear all metrics
   */
  clear(): void {
    this.metrics = [];
  }

  /**
   * Get all operation names
   */
  getOperationNames(): string[] {
    return [...new Set(this.metrics.map(m => m.name))];
  }
}

// Global performance monitor instance
export const performanceMonitor = new PerformanceMonitor();

/**
 * Decorator for monitoring API route performance
 */
export function withPerformanceMonitoring(operationName: string) {
  return function decorator(target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function(...args: any[]) {
      return performanceMonitor.timeFunction(
        operationName,
        () => originalMethod.apply(this, args),
        { method: propertyKey }
      );
    };

    return descriptor;
  };
}

/**
 * Express-style middleware for performance monitoring
 */
export function performanceMiddleware(operationName: string) {
  return function(handler: Function) {
    return async function(request: Request, ...args: any[]) {
      const url = new URL(request.url);
      const method = request.method;
      
      return performanceMonitor.timeFunction(
        operationName,
        () => handler(request, ...args),
        { 
          method, 
          path: url.pathname,
          userAgent: request.headers.get('user-agent')?.substring(0, 100)
        }
      );
    };
  };
}