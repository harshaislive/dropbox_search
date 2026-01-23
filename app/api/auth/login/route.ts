import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  try {
    const { password } = await request.json();

    // Get password from environment
    const appPassword = process.env.APP_PASSWORD;

    if (!appPassword) {
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }

    // Verify password
    if (password === appPassword) {
      // Create session cookie (persistent for 30 days)
      const sessionData = {
        authenticated: true,
        timestamp: Date.now(),
      };

      const cookieStore = await cookies();
      cookieStore.set('app_session', JSON.stringify(sessionData), {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 30 * 24 * 60 * 60, // 30 days in seconds
        path: '/',
      });

      return NextResponse.json({ success: true });
    }

    // Wrong password
    return NextResponse.json(
      { error: 'Invalid password' },
      { status: 401 }
    );
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Invalid request' },
      { status: 400 }
    );
  }
}
