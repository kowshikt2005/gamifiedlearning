import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/lib/services/auth-service';
import { AtlasUserService } from '@/lib/services/atlas-user-service';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    const result = await AuthService.login(email, password);
    
    if (!result) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    const { user, token } = result;
    
    // Get complete user data including progress
    if (!user._id) {
      throw new Error('User ID not found');
    }
    const completeUser = await AtlasUserService.getUserById(user._id.toString());

    // Set cookie with token (optional, but useful for browser-based auth)
    const response = NextResponse.json({
      success: true,
      user: completeUser,
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
    console.error('Login error:', error);
    
    if (error instanceof Error && error.message === 'Invalid email or password') {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }
    
    if (error instanceof Error && error.message === 'User with this email or username already exists') {
      return NextResponse.json(
        { error: 'User already exists' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}