import { NextResponse } from 'next/server';
import { getAuthUrl } from '../../../../lib/spotify';

export async function GET(request: Request) {
  const hostHeader = request.headers.get('host') || '';
  const [hostName, hostPort = '3000'] = hostHeader.split(':');
  const url = new URL(request.url);
  console.log('Spotify auth start:', url.href, 'host header:', hostHeader);

  if (hostName === 'localhost') {
    const redirectUrl = `http://127.0.0.1:${hostPort}${url.pathname}`;
    console.log('Redirecting localhost host header to loopback:', redirectUrl);
    return NextResponse.redirect(redirectUrl);
  }

  const authUrl = getAuthUrl();
  console.log('Redirecting to Spotify auth URL:', authUrl);
  return NextResponse.redirect(authUrl);
}
