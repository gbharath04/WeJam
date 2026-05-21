import { NextResponse } from 'next/server';
import cookie from 'cookie';
import { nanoid } from 'nanoid';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { getRoom, createRoom, getSession } = require('../../../lib/database.js');
const { DEFAULT_ROOM_SETTINGS, normalizeRoomSettings } = require('../../../lib/roomSettings.js');

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const roomId = searchParams.get('id');
  if (!roomId) {
    return NextResponse.json({ error: 'Missing room id' }, { status: 400 });
  }
  
  const room = getRoom(roomId);
  if (!room) {
    return NextResponse.json({ error: 'Room not found' }, { status: 404 });
  }
  return NextResponse.json({ ...room, settings: normalizeRoomSettings(room.settings) });
}

export async function POST(request: Request) {
  const cookies = cookie.parse(request.headers.get('cookie') || '');
  const sessionId = cookies.wejam_session;
  if (!sessionId) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }
  
  const session = getSession(sessionId);
  if (!session) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }
  
  const body = await request.json();
  const roomId = nanoid(8);
  const room = createRoom(roomId, {
    owner: {
      id: sessionId,
      displayName: session.profile.display_name || session.profile.id
    },
    title: body.title || `${session.profile.display_name}'s Jam Room`,
    settings: {
      ...DEFAULT_ROOM_SETTINGS,
      accent: body.accent || DEFAULT_ROOM_SETTINGS.accent,
      banner: body.banner || DEFAULT_ROOM_SETTINGS.banner,
      layout: body.layout || DEFAULT_ROOM_SETTINGS.layout
    }
  });
  return NextResponse.json({ room });
}
