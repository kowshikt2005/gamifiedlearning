/**
 * Shared JWT utilities
 *
 * Centralizes JWT secret retrieval and token verification
 * to prevent insecure fallback secrets across API routes.
 */

import jwt from 'jsonwebtoken';
import { NextRequest } from 'next/server';
import { ObjectId } from 'mongodb';

/**
 * Get the JWT secret, throwing if not configured.
 * Never falls back to a hardcoded value.
 */
export function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET or NEXTAUTH_SECRET must be set in environment variables');
  }
  return secret;
}

interface DecodedToken {
  userId: string;
  email: string;
}

/**
 * Extract and verify user ObjectId from a Bearer token.
 */
export function getUserIdFromRequest(request: NextRequest): ObjectId {
  const decoded = verifyRequestToken(request);
  return new ObjectId(decoded.userId);
}

/**
 * Extract and verify user ID string from a Bearer token.
 */
export function getUserStringIdFromRequest(request: NextRequest): string {
  const decoded = verifyRequestToken(request);
  return decoded.userId;
}

function verifyRequestToken(request: NextRequest): DecodedToken {
  const authHeader = request.headers.get('authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('No token provided');
  }

  const token = authHeader.substring(7);
  return jwt.verify(token, getJwtSecret()) as DecodedToken;
}
