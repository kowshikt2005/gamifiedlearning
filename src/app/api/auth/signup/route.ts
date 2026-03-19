import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/lib/services/auth-service';

export async function POST(request: NextRequest) {
  try {
    const { username, email, password } = await request.json();

    if (!username || !email || !password) {
      return NextResponse.json(
        { error: 'Username, email, and password are required' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Validate password strength (at least 8 characters, matching client-side validation)
    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters long' },
        { status: 400 }
      );
    }

    const result = await AuthService.register(username, email, password);
    
    if (!result) {
      return NextResponse.json(
        { error: 'Registration failed' },
        { status: 500 }
      );
    }

    const { user, token } = result;

    // Get complete user data including progress
    if (!user._id) {
      throw new Error('User ID not found');
    }

    // Set cookie with token — strip password hash from response
    const { password: _pw, ...safeUser } = user;
    const response = NextResponse.json({
      success: true,
      user: safeUser,
      token,
    });

    // Set HTTP-only cookie for better security
    response.cookies.set('auth-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 1 week
      path: '/',
    });

    return response;
  } catch (error: unknown) {
    console.error('Signup error:', error);
    
    if (error instanceof Error && error.message === 'User with this email or username already exists') {
      return NextResponse.json(
        { error: 'User with this email or username already exists' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}