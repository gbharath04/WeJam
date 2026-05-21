const scopes = [
  'user-read-email',
  'user-read-private',
  'streaming',
  'user-modify-playback-state',
  'user-read-playback-state'
].join(' ');

const clientId = process.env.SPOTIFY_CLIENT_ID;
const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
const redirectUri = `${process.env.NEXT_PUBLIC_BASE_URL}/api/auth/spotify/callback`;

function getAuthUrl() {
  const params = new URLSearchParams({
    client_id: clientId || '',
    response_type: 'code',
    redirect_uri: redirectUri,
    scope: scopes,
    show_dialog: 'true'
  });
  return `https://accounts.spotify.com/authorize?${params.toString()}`;
}

async function fetchToken(code: string) {
  const raw = `${clientId}:${clientSecret}`;
  const encoded = Buffer.from(raw).toString('base64');
  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${encoded}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri
    })
  });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Failed to get Spotify token (${response.status}): ${body}`);
  }
  return response.json();
}

async function refreshToken(refreshToken: string) {
  const raw = `${clientId}:${clientSecret}`;
  const encoded = Buffer.from(raw).toString('base64');
  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${encoded}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken
    })
  });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Failed to refresh Spotify token (${response.status}): ${body}`);
  }
  return response.json();
}

async function fetchCurrentUser(accessToken: string) {
  const response = await fetch('https://api.spotify.com/v1/me', {
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  });
  if (!response.ok) {
    throw new Error('Spotify profile lookup failed');
  }
  return response.json();
}

async function verifyPremium(accessToken: string) {
  const profile = await fetchCurrentUser(accessToken);
  return profile.product === 'premium';
}

export { getAuthUrl, fetchToken, fetchCurrentUser, verifyPremium, refreshToken };
