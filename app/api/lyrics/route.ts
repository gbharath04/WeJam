import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const track = url.searchParams.get('track')?.trim();
  const artist = url.searchParams.get('artist')?.trim();
  const album = url.searchParams.get('album')?.trim();
  const durationSec = url.searchParams.get('duration')?.trim();

  if (!track || !artist) {
    return NextResponse.json({ error: 'Missing track or artist' }, { status: 400 });
  }

  const params = new URLSearchParams({
    track_name: track,
    artist_name: artist
  });
  if (album) params.set('album_name', album);
  if (durationSec) params.set('duration', durationSec);

  try {
    const response = await fetch(`https://lrclib.net/api/get?${params.toString()}`, {
      headers: { 'User-Agent': 'WeJam/0.1 (https://github.com/wejam)' },
      next: { revalidate: 3600 }
    });

    if (response.status === 404) {
      return NextResponse.json({ synced: null, plain: null });
    }

    if (!response.ok) {
      return NextResponse.json({ error: 'Lyrics service unavailable' }, { status: 502 });
    }

    const data = await response.json();
    return NextResponse.json({
      synced: data.syncedLyrics || null,
      plain: data.plainLyrics || null
    });
  } catch (err) {
    console.error('Lyrics fetch error:', err);
    return NextResponse.json({ error: 'Failed to fetch lyrics' }, { status: 500 });
  }
}
