import { createRequire } from 'module';
import { refreshToken as refreshSpotifyToken } from './spotify';

const require = createRequire(import.meta.url);
const { getSession, createSession } = require('./database.js');

const REFRESH_BUFFER_MS = 60_000;

export type EnsureAccessResult =
  | { ok: true; accessToken: string }
  | { ok: false; status: number; error: string };

export async function ensureSpotifyAccessToken(sessionId: string): Promise<EnsureAccessResult> {
  const session = getSession(sessionId);
  if (!session) {
    return { ok: false, status: 401, error: 'Authentication required' };
  }

  const tokenExpiresAt = session.tokenExpiresAt ?? 0;
  if (session.accessToken && Date.now() < tokenExpiresAt - REFRESH_BUFFER_MS) {
    return { ok: true, accessToken: session.accessToken };
  }

  if (!session.refreshToken) {
    return { ok: false, status: 401, error: 'No refresh token' };
  }

  try {
    const tokenData = await refreshSpotifyToken(session.refreshToken);
    createSession(sessionId, {
      profile: session.profile,
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token || session.refreshToken,
      createdAt: session.createdAt,
      tokenExpiresAt: Date.now() + (tokenData.expires_in ?? 3600) * 1000
    });
    return { ok: true, accessToken: tokenData.access_token };
  } catch (err) {
    console.error('ensureSpotifyAccessToken:', err);
    return { ok: false, status: 401, error: 'Token refresh failed' };
  }
}
