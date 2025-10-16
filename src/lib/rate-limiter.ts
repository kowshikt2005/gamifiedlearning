/**
 * Simple in-memory rate limiter for API endpoints
 * Prevents excessive API calls and improves performance
 */

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

class RateLimiter {
  private limits: Map<string, RateLimitEntry> = new Map();
  private readonly windowMs: number;
  private readonly maxRequests: number;

  constructor(windowMs: number = 60000, maxRequests: number = 60) {
    this.windowMs = windowMs;
    this.maxRequests = maxRequests;
    
    // Clean up expired entries every 5 minutes
    setInterval(() => this.cleanup(), 5 * 60 * 1000);
  }

  /**
   * Check if request is allowed for the given identifier
   */
  isAllowed(identifier: string): boolean {
    const now = Date.now();
    const entry = this.limits.get(identifier);

    if (!entry || now > entry.resetTime) {
      // First request or window expired
      this.limits.set(identifier, {
        count: 1,
        resetTime: now + this.windowMs
      });
      return true;
    }

    if (entry.count >= this.maxRequests) {
      return false;
    }

    entry.count++;
    return true;
  }

  /**
   * Get remaining requests for identifier
   */
  getRemaining(identifier: string): number {
    const entry = this.limits.get(identifier);
    if (!entry || Date.now() > entry.resetTime) {
      return this.maxRequests;
    }
    return Math.max(0, this.maxRequests - entry.count);
  }

  /**
   * Get reset time for identifier
   */
  getResetTime(identifier: string): number {
    const entry = this.limits.get(identifier);
    if (!entry || Date.now() > entry.resetTime) {
      return Date.now() + this.windowMs;
    }
    return entry.resetTime;
  }

  /**
   * Clean up expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.limits.entries()) {
      if (now > entry.resetTime) {
        this.limits.delete(key);
      }
    }
  }
}

// Create rate limiter instances for different endpoints
export const studySessionLimiter = new RateLimiter(60000, 30); // 30 requests per minute
export const generalApiLimiter = new RateLimiter(60000, 100); // 100 requests per minute

/**
 * Rate limiting middleware for API routes
 */
export function withRateLimit(
  limiter: RateLimiter,
  getIdentifier: (request: Request) => string = (req) => {
    // Use IP address as default identifier
    const forwarded = req.headers.get('x-forwarded-for');
    const ip = forwarded ? forwarded.split(',')[0] : 'unknown';
    return ip;
  }
) {
  return function rateLimitMiddleware(handler: Function) {
    return async function(request: Request, ...args: any[]) {
      const identifier = getIdentifier(request);
      
      if (!limiter.isAllowed(identifier)) {
        return new Response(
          JSON.stringify({
            error: 'Rate limit exceeded',
            retryAfter: Math.ceil((limiter.getResetTime(identifier) - Date.now()) / 1000)
          }),
          {
            status: 429,
            headers: {
              'Content-Type': 'application/json',
              'Retry-After': Math.ceil((limiter.getResetTime(identifier) - Date.now()) / 1000).toString(),
              'X-RateLimit-Limit': '30',
              'X-RateLimit-Remaining': limiter.getRemaining(identifier).toString(),
              'X-RateLimit-Reset': limiter.getResetTime(identifier).toString()
            }
          }
        );
      }

      // Add rate limit headers to successful responses
      const response = await handler(request, ...args);
      
      if (response instanceof Response) {
        response.headers.set('X-RateLimit-Limit', '30');
        response.headers.set('X-RateLimit-Remaining', limiter.getRemaining(identifier).toString());
        response.headers.set('X-RateLimit-Reset', limiter.getResetTime(identifier).toString());
      }

      return response;
    };
  };
}