import { NextResponse } from 'next/server';
import cookie from 'cookie';
import { ensureSpotifyAccessToken } from '../../../../lib/ensureSpotifyAccess';

export async function POST(request: Request) {
  const cookies = cookie.parse(request.headers.get('cookie') || '');
  const sessionId = cookies.wejam_session;

  if (!sessionId) {
    return NextResponse.json({ error: 'No session' }, { status: 401 });
  }

  const result = await ensureSpotifyAccessToken(sessionId);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({ accessToken: result.accessToken });
}
