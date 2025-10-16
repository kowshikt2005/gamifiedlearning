/**
 * Centralized API error handling for database connection issues
 */

import { NextResponse } from 'next/server';

export interface ApiError {
  message: string;
  code?: string;
  status: number;
  retryable: boolean;
}

/**
 * Classify database errors and determine appropriate response
 */
export function classifyDatabaseError(error: any): ApiError {
  const errorMessage = error?.message || 'Unknown database error';
  const errorCode = error?.code || error?.name;

  // Network connection errors (retryable)
  if (errorMessage.includes('ECONNRESET') || 
      errorMessage.includes('ENOTFOUND') || 
      errorMessage.includes('ETIMEDOUT') ||
      errorMessage.includes('MongoNetworkError') ||
      errorMessage.includes('MongoServerSelectionError')) {
    return {
      message: 'Database connection temporarily unavailable. Please try again in a moment.',
      code: 'DB_CONNECTION_ERROR',
      status: 503, // Service Unavailable
      retryable: true
    };
  }

  // Authentication errors (not retryable)
  if (errorMessage.includes('authentication failed') ||
      errorMessage.includes('unauthorized') ||
      errorCode === 'AUTHENTICATION_FAILED') {
    return {
      message: 'Database authentication failed',
      code: 'DB_AUTH_ERROR',
      status: 500,
      retryable: false
    };
  }

  // Validation errors (not retryable)
  if (errorMessage.includes('validation failed') ||
      errorCode === 'VALIDATION_ERROR') {
    return {
      message: 'Invalid data provided',
      code: 'VALIDATION_ERROR',
      status: 400,
      retryable: false
    };
  }

  // Duplicate key errors (not retryable)
  if (errorCode === 11000 || errorMessage.includes('duplicate key')) {
    return {
      message: 'Duplicate data detected',
      code: 'DUPLICATE_ERROR',
      status: 409,
      retryable: false
    };
  }

  // Generic database errors (potentially retryable)
  return {
    message: 'Database operation failed. Please try again.',
    code: 'DB_ERROR',
    status: 500,
    retryable: true
  };
}

/**
 * Create standardized error response
 */
export function createErrorResponse(error: any): NextResponse {
  const apiError = classifyDatabaseError(error);
  
  console.error('API Error:', {
    message: apiError.message,
    code: apiError.code,
    status: apiError.status,
    retryable: apiError.retryable,
    originalError: error?.message || error
  });

  const headers: Record<string, string> = {
    'Content-Type': 'application/json'
  };

  // Add retry headers for retryable errors
  if (apiError.retryable) {
    headers['Retry-After'] = '30'; // Suggest retry after 30 seconds
    headers['X-Retryable'] = 'true';
  }

  return NextResponse.json(
    {
      success: false,
      error: apiError.message,
      code: apiError.code,
      retryable: apiError.retryable,
      timestamp: new Date().toISOString()
    },
    {
      status: apiError.status,
      headers
    }
  );
}

/**
 * Wrapper for API route handlers with error handling
 */
export function withErrorHandling(handler: Function) {
  return async function(request: Request, ...args: any[]) {
    try {
      return await handler(request, ...args);
    } catch (error) {
      return createErrorResponse(error);
    }
  };
}

/**
 * Check if an error is a database connection issue
 */
export function isDatabaseConnectionError(error: any): boolean {
  const errorMessage = error?.message || '';
  return errorMessage.includes('ECONNRESET') || 
         errorMessage.includes('ENOTFOUND') || 
         errorMessage.includes('ETIMEDOUT') ||
         errorMessage.includes('MongoNetworkError') ||
         errorMessage.includes('MongoServerSelectionError');
}