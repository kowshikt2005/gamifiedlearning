/**
 * Client-side error handling for API requests
 */

interface ApiErrorResponse {
  success: false;
  error: string;
  code?: string;
  retryable?: boolean;
  timestamp?: string;
}

interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
}

const defaultRetryConfig: RetryConfig = {
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 10000,
  backoffMultiplier: 2
};

/**
 * Enhanced fetch with automatic retry for retryable errors
 */
export async function resilientFetch(
  url: string, 
  options: RequestInit = {},
  retryConfig: Partial<RetryConfig> = {}
): Promise<Response> {
  const config = { ...defaultRetryConfig, ...retryConfig };
  let lastError: Error = new Error('Unknown error');

  for (let attempt = 1; attempt <= config.maxRetries; attempt++) {
    try {
      const response = await fetch(url, options);
      
      // If response is successful, return it
      if (response.ok) {
        return response;
      }

      // Check if error is retryable
      if (response.status === 503 || response.status === 502 || response.status === 504) {
        const errorData: ApiErrorResponse = await response.json().catch(() => ({ 
          success: false, 
          error: 'Service temporarily unavailable',
          retryable: true 
        }));

        if (errorData.retryable && attempt < config.maxRetries) {
          const delay = Math.min(
            config.baseDelay * Math.pow(config.backoffMultiplier, attempt - 1),
            config.maxDelay
          );

          console.warn(`Request failed (attempt ${attempt}/${config.maxRetries}), retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
      }

      // Non-retryable error or max retries reached
      return response;

    } catch (error) {
      lastError = error as Error;
      
      // Network errors are typically retryable
      if (attempt < config.maxRetries && isNetworkError(lastError)) {
        const delay = Math.min(
          config.baseDelay * Math.pow(config.backoffMultiplier, attempt - 1),
          config.maxDelay
        );

        console.warn(`Network error (attempt ${attempt}/${config.maxRetries}), retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }

      throw lastError;
    }
  }

  throw lastError;
}

/**
 * Check if error is a network error
 */
function isNetworkError(error: Error): boolean {
  return error.message.includes('fetch') || 
         error.message.includes('network') ||
         error.message.includes('Failed to fetch') ||
         error.name === 'TypeError';
}

/**
 * Parse API error response
 */
export async function parseApiError(response: Response): Promise<string> {
  try {
    const errorData: ApiErrorResponse = await response.json();
    return errorData.error || `Request failed with status ${response.status}`;
  } catch {
    return `Request failed with status ${response.status}`;
  }
}

/**
 * Show user-friendly error message
 */
export function getUserFriendlyErrorMessage(error: unknown): string {
  if (typeof error === 'string') {
    return error;
  }

  const err = error as any; // Type assertion for error handling
  if (err?.message) {
    // Network errors
    if (err.message.includes('Failed to fetch') || err.message.includes('network')) {
      return 'Network connection issue. Please check your internet connection and try again.';
    }

    // Database connection errors
    if (err.message.includes('Database connection') || err.message.includes('temporarily unavailable')) {
      return 'Service is temporarily unavailable. Please try again in a moment.';
    }

    return err.message;
  }

  return 'An unexpected error occurred. Please try again.';
}

/**
 * Enhanced API client with error handling
 */
export class ApiClient {
  private baseUrl: string;
  private defaultHeaders: Record<string, string>;

  constructor(baseUrl = '', defaultHeaders: Record<string, string> = {}) {
    this.baseUrl = baseUrl;
    this.defaultHeaders = defaultHeaders;
  }

  /**
   * Make a resilient API request
   */
  async request<T>(
    endpoint: string, 
    options: RequestInit = {},
    retryConfig?: Partial<RetryConfig>
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const requestOptions: RequestInit = {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...this.defaultHeaders,
        ...options.headers
      }
    };

    const response = await resilientFetch(url, requestOptions, retryConfig);

    if (!response.ok) {
      const errorMessage = await parseApiError(response);
      throw new Error(errorMessage);
    }

    return response.json();
  }

  /**
   * GET request
   */
  async get<T>(endpoint: string, headers?: Record<string, string>): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET', headers });
  }

  /**
   * POST request
   */
  async post<T>(endpoint: string, data?: unknown, headers?: Record<string, string>): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
      headers
    });
  }

  /**
   * PUT request
   */
  async put<T>(endpoint: string, data?: unknown, headers?: Record<string, string>): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
      headers
    });
  }

  /**
   * DELETE request
   */
  async delete<T>(endpoint: string, headers?: Record<string, string>): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE', headers });
  }
}

// Create default API client instance
export const apiClient = new ApiClient();