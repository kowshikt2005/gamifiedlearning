/**
 * Debounce utilities to prevent excessive API calls
 */

/**
 * Debounce function that delays execution until after wait milliseconds
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number,
  immediate = false
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  
  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null;
      if (!immediate) func(...args);
    };
    
    const callNow = immediate && !timeout;
    
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(later, wait);
    
    if (callNow) func(...args);
  };
}

/**
 * Throttle function that limits execution to once per wait milliseconds
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  
  return function executedFunction(...args: Parameters<T>) {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, wait);
    }
  };
}

/**
 * Batch multiple calls into a single execution
 */
export class BatchProcessor<T> {
  private batch: T[] = [];
  private timeout: NodeJS.Timeout | null = null;
  private readonly processor: (items: T[]) => Promise<void>;
  private readonly delay: number;

  constructor(processor: (items: T[]) => Promise<void>, delay: number = 1000) {
    this.processor = processor;
    this.delay = delay;
  }

  add(item: T): void {
    this.batch.push(item);
    
    if (this.timeout) {
      clearTimeout(this.timeout);
    }
    
    this.timeout = setTimeout(() => {
      this.flush();
    }, this.delay);
  }

  async flush(): Promise<void> {
    if (this.batch.length === 0) return;
    
    const items = [...this.batch];
    this.batch = [];
    
    if (this.timeout) {
      clearTimeout(this.timeout);
      this.timeout = null;
    }
    
    try {
      await this.processor(items);
    } catch (error) {
      console.error('Batch processing failed:', error);
    }
  }
}

/**
 * Request deduplication to prevent duplicate API calls
 */
export class RequestDeduplicator {
  private pending: Map<string, Promise<any>> = new Map();

  async dedupe<T>(key: string, requestFn: () => Promise<T>): Promise<T> {
    if (this.pending.has(key)) {
      return this.pending.get(key);
    }

    const promise = requestFn()
      .finally(() => {
        this.pending.delete(key);
      });

    this.pending.set(key, promise);
    return promise;
  }

  clear(): void {
    this.pending.clear();
  }
}

// Global request deduplicator instance
export const globalDeduplicator = new RequestDeduplicator();