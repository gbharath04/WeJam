import { NextResponse } from 'next/server';
import cookie from 'cookie';
import { ensureSpotifyAccessToken } from '../../../../lib/ensureSpotifyAccess';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const query = url.searchParams.get('query')?.trim();
  if (!query) {
    return NextResponse.json({ error: 'Missing search query' }, { status: 400 });
  }

  const cookies = cookie.parse(request.headers.get('cookie') || '');
  const sessionId = cookies.wejam_session;
  if (!sessionId) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const access = await ensureSpotifyAccessToken(sessionId);
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const response = await fetch(
    `https://api.spotify.com/v1/search?type=track&limit=12&q=${encodeURIComponent(query)}`,
    {
      headers: {
        Authorization: `Bearer ${access.accessToken}`
      }
    }
  );

  if (!response.ok) {
    const body = await response.text();
    return NextResponse.json({ error: `Spotify search failed: ${body}` }, { status: response.status });
  }

  const data = await response.json();
  return NextResponse.json({ tracks: data.tracks?.items || [] });
}
