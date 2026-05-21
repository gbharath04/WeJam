import { NextResponse } from 'next/server';
import cookie from 'cookie';
import { ensureSpotifyAccessToken } from '../../../../lib/ensureSpotifyAccess';

async function searchTracks(accessToken: string, query: string, limit = 10) {
  const response = await fetch(
    `https://api.spotify.com/v1/search?type=track&limit=${limit}&q=${encodeURIComponent(query)}`,
    {
      headers: { Authorization: `Bearer ${accessToken}` }
    }
  );
  if (!response.ok) {
    return [];
  }
  const data = await response.json();
  return data.tracks?.items || [];
}

async function fetchRecommendations(
  accessToken: string,
  seeds: { seed_tracks?: string; seed_artists?: string }
) {
  const params = new URLSearchParams({ limit: '10', market: 'US' });
  if (seeds.seed_tracks) params.set('seed_tracks', seeds.seed_tracks);
  if (seeds.seed_artists) params.set('seed_artists', seeds.seed_artists);
  if (!seeds.seed_tracks && !seeds.seed_artists) return null;

  const response = await fetch(`https://api.spotify.com/v1/recommendations?${params.toString()}`, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  if (!response.ok) return null;
  const data = await response.json();
  return data.tracks || [];
}

export async function GET(request: Request) {
  const cookies = cookie.parse(request.headers.get('cookie') || '');
  const sessionId = cookies.wejam_session;
  if (!sessionId) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const access = await ensureSpotifyAccessToken(sessionId);
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const url = new URL(request.url);
  const seedTrack = url.searchParams.get('seed_track')?.trim();
  const seedArtist = url.searchParams.get('seed_artist')?.trim();
  const query = url.searchParams.get('q')?.trim();

  try {
    let tracks: Array<Record<string, unknown>> = [];

    if (seedTrack || seedArtist) {
      const recommended = await fetchRecommendations(access.accessToken, {
        seed_tracks: seedTrack || undefined,
        seed_artists: seedArtist || undefined
      });
      if (recommended?.length) {
        tracks = recommended;
      }
    }

    if (tracks.length === 0) {
      const searchQuery = query || (seedArtist ? `artist:${seedArtist}` : 'pop');
      tracks = await searchTracks(access.accessToken, searchQuery, 12);
    }

    if (tracks.length === 0) {
      tracks = await searchTracks(access.accessToken, 'top hits', 12);
    }

    return NextResponse.json({ tracks });
  } catch (err) {
    console.error('Recommendations fallback error:', err);
    return NextResponse.json({ error: 'Failed to fetch suggestions' }, { status: 500 });
  }
}
