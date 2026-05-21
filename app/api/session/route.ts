import { NextResponse } from 'next/server';
import cookie from 'cookie';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { getSession } = require('../../../lib/database.js');

export async function GET(request: Request) {
  const cookies = cookie.parse(request.headers.get('cookie') || '');
  const sessionId = cookies.wejam_session;
  if (!sessionId) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }
  
  const session = getSession(sessionId);
  if (!session) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }
  return NextResponse.json({ authenticated: true, profile: session.profile, sessionId });
}
