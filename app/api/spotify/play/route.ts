import { NextResponse } from 'next/server';
import cookie from 'cookie';
import { ensureSpotifyAccessToken } from '../../../../lib/ensureSpotifyAccess';

export async function POST(request: Request) {
  const cookies = cookie.parse(request.headers.get('cookie') || '');
  const sessionId = cookies.wejam_session;
  if (!sessionId) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const access = await ensureSpotifyAccessToken(sessionId);
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const body = await request.json();
  const { uri, deviceId } = body;
  if (!uri) {
    return NextResponse.json({ error: 'Missing track URI' }, { status: 400 });
  }

  if (deviceId) {
    await fetch('https://api.spotify.com/v1/me/player', {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${access.accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ device_ids: [deviceId], play: false })
    });
  }

  const playUrl = deviceId
    ? `https://api.spotify.com/v1/me/player/play?device_id=${encodeURIComponent(deviceId)}`
    : 'https://api.spotify.com/v1/me/player/play';

  const playResponse = await fetch(playUrl, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${access.accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ uris: [uri] })
  });

  if (!playResponse.ok) {
    const bodyText = await playResponse.text();
    return NextResponse.json({ error: `Spotify playback failed: ${bodyText}` }, { status: playResponse.status });
  }

  return NextResponse.json({ success: true });
}
