import { NextResponse } from 'next/server';
import cookie from 'cookie';
import { nanoid } from 'nanoid';
import { fetchToken, fetchCurrentUser, verifyPremium } from '../../../../../lib/spotify';
import { createSession } from '../../../../../lib/database';
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const error = url.searchParams.get('error');
const baseUrl =
  process.env.NEXT_PUBLIC_BASE_URL ||
  `${url.protocol}//${url.host}`;

  if (error || !code) {
    return NextResponse.redirect(`${baseUrl}/?error=${encodeURIComponent(error || 'Authorization failed')}`);
  }

  try {
    const tokenData = await fetchToken(code);
    const profile = await fetchCurrentUser(tokenData.access_token);
    const isPremium = await verifyPremium(tokenData.access_token);
    if (!isPremium) {
      return NextResponse.redirect(`${baseUrl}/?error=${encodeURIComponent('Spotify Premium required')}`);
    }

    const sessionId = nanoid(24);
    createSession(sessionId, {
      profile,
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token,
      createdAt: Date.now(),
      tokenExpiresAt: Date.now() + (tokenData.expires_in ?? 3600) * 1000
    });

    const response = NextResponse.redirect(`${baseUrl}/`);
    response.headers.set(
      'Set-Cookie',
      cookie.serialize('wejam_session', sessionId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24 * 7
      })
    );
    return response;
  } catch (err) {
    console.error('Spotify auth callback error:', err);
    const response = NextResponse.redirect(`${baseUrl}/?error=${encodeURIComponent('Authentication failed')}`);
    response.headers.set('Set-Cookie', cookie.serialize('wejam_session', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 0
    }));
    return response;
  }
}
