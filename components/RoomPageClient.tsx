'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { io, Socket } from 'socket.io-client';
import SpotifyPlayer, { type PlaybackUpdate } from './SpotifyPlayer';
import LyricsPanel from './LyricsPanel';
import RoomCustomizePanel from './RoomCustomizePanel';
import { normalizeRoomSettings, type RoomSettings } from '../lib/roomSettings';
import { getAccentTheme } from '../lib/roomAccent';
import { hasCustomBackground, pageBackgroundStyle } from '../lib/roomTheme';

interface Props {
  roomId: string;
}

type RoomState = {
  roomId: string;
  title: string;
  owner: { id: string; displayName: string };
  settings: RoomSettings;
  users: Array<{ id: string; displayName: string }>;
  chat: Array<{ id: string; author: string; text: string; createdAt: string }>;
};

export default function RoomPageClient({ roomId }: Props) {
  const router = useRouter();
  const [room, setRoom] = useState<RoomState | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [session, setSession] = useState<any>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessionChecked, setSessionChecked] = useState(false);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Array<any>>([]);
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const [playerStatus, setPlayerStatus] = useState('Waiting for Spotify player...');
  const [playlist, setPlaylist] = useState<Array<any>>([]);
  const [playlistIndex, setPlaylistIndex] = useState(-1);
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [theme, setTheme] = useState<RoomSettings>(normalizeRoomSettings(null));
  const [isHost, setIsHost] = useState(false);
  const [chatVisible, setChatVisible] = useState(true);
  const [customizeVisible, setCustomizeVisible] = useState(false);
  const [lyricsVisible, setLyricsVisible] = useState(false);
  const [nowPlaying, setNowPlaying] = useState<PlaybackUpdate>({
    track: null,
    positionMs: 0,
    durationMs: 0,
    isPlaying: false
  });
  const socketRef = useRef<Socket | null>(null);
  const playlistRef = useRef<Array<any>>([]);
  const playlistIndexRef = useRef(-1);
  const deviceIdRef = useRef<string | null>(null);
  const sessionIdRef = useRef<string | null>(null);

  useEffect(() => {
    sessionIdRef.current = sessionId;
  }, [sessionId]);

  useEffect(() => {
    playlistRef.current = playlist;
  }, [playlist]);
  useEffect(() => {
    playlistIndexRef.current = playlistIndex;
  }, [playlistIndex]);
  useEffect(() => {
    deviceIdRef.current = deviceId;
  }, [deviceId]);

  useEffect(() => {
    fetch('/api/session')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        setSession(data?.profile || null);
        setSessionId(data?.sessionId || null);
      })
      .catch(() => {
        setSession(null);
        setSessionId(null);
      })
      .finally(() => setSessionChecked(true));
  }, []);

  useEffect(() => {
    if (!sessionChecked || session) return;
    router.replace('/');
  }, [sessionChecked, session, router]);

  useEffect(() => {
    if (!session) return;

    fetch('/api/spotify/token', { credentials: 'include' })
      .then(async (res) => {
        if (res.ok) return res.json();
        if (res.status === 401) {
          const refreshed = await fetch('/api/spotify/refresh', {
            method: 'POST',
            credentials: 'include'
          });
          if (refreshed.ok) return refreshed.json();
        }
        return null;
      })
      .then((data) => {
        setAccessToken(data?.accessToken || null);
      })
      .catch(() => {});
  }, [session]);

  async function searchTracks() {
    if (!searchQuery.trim()) return;
    try {
      const response = await fetch(`/api/spotify/search?query=${encodeURIComponent(searchQuery.trim())}`);
      if (!response.ok) {
        throw new Error('Search failed');
      }
      const data = await response.json();
      setSearchResults(data.tracks || []);
      setIsSearchExpanded(true);
      setError('');
    } catch (err) {
      setError('Unable to search tracks.');
    }
  }

  function collapseSearch() {
    setIsSearchExpanded(false);
    setSearchResults([]);
  }

  async function startPlaybackUri(uri: string): Promise<boolean> {
    const dev = deviceIdRef.current;
    if (!dev) return false;
    try {
      const response = await fetch('/api/spotify/play', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uri, deviceId: dev })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(typeof data?.error === 'string' ? data.error : 'Playback request failed');
        return false;
      }
      setError('');
      return true;
    } catch {
      setError('Unable to start playback.');
      return false;
    }
  }

  function removeFromPlaylist(indexToRemove: number) {
    const prev = playlistRef.current;
    const curIdx = playlistIndexRef.current;
    const updated = prev.filter((_, index) => index !== indexToRemove);
    let newIdx = curIdx;
    if (indexToRemove < curIdx) newIdx = curIdx - 1;
    else if (indexToRemove === curIdx) newIdx = updated.length === 0 ? -1 : Math.min(curIdx, updated.length - 1);
    setPlaylist(updated);
    setPlaylistIndex(newIdx);

    const removedCurrent = indexToRemove === curIdx;
    const dev = deviceIdRef.current;
    if (removedCurrent && updated.length > 0 && dev && newIdx >= 0) {
      const track = updated[newIdx];
      void startPlaybackUri(track.uri).then((ok) => {
        if (ok) setPlaylistIndex(newIdx);
      });
    }
  }

  async function playTrack(track: any) {
    if (!deviceIdRef.current) {
      setError('Spotify player is not active yet. Wait for the WeJam player to initialize.');
      return;
    }

    try {
      const ok = await startPlaybackUri(track.uri);
      if (!ok) return;
      setPlaylist((prev) => [track, ...prev]);
      setPlaylistIndex(0);
    } catch (err: any) {
      setError(err.message || 'Unable to start playback.');
    }
  }

  function addToPlaylist(track: any) {
    setPlaylist((prev) => [track, ...prev]);
  }

  async function playNext() {
    const dev = deviceIdRef.current;
    if (!dev) {
      setError('Spotify player is not active yet.');
      return;
    }
    const list = playlistRef.current;
    if (list.length === 0) return;

    let idx = playlistIndexRef.current;
    if (idx < 0) idx = 0;
    if (idx >= list.length) idx = list.length - 1;

    const nextIdx = idx + 1;
    if (nextIdx < list.length) {
      const ok = await startPlaybackUri(list[nextIdx].uri);
      if (ok) setPlaylistIndex(nextIdx);
      return;
    }

    // No "following" track in the queue (e.g. removed finished head; one song left at index 0).
    if (list.length === 1 && idx === 0) {
      const ok = await startPlaybackUri(list[0].uri);
      if (ok) setPlaylistIndex(0);
      return;
    }

    // At last track of a multi-item queue — suggest similar tracks (search fallback if Spotify blocks recommendations API)
    if (list.length > 1 && idx === list.length - 1) {
      try {
        const lastTrack = list[idx];
        const params = new URLSearchParams();
        if (lastTrack?.id) params.set('seed_track', lastTrack.id);
        const artistName = lastTrack?.artists?.[0]?.name;
        if (artistName) params.set('q', artistName);
        const recResponse = await fetch(`/api/spotify/recommendations?${params.toString()}`, {
          credentials: 'include'
        });
        if (!recResponse.ok) return;
        const recData = await recResponse.json();
        const recommendations = (recData.tracks || []).filter(
          (t: { id?: string }) => t.id && t.id !== lastTrack?.id
        );
        if (recommendations.length === 0) return;

        const randomTrack = recommendations[Math.floor(Math.random() * recommendations.length)];
        const ok = await startPlaybackUri(randomTrack.uri);
        if (ok) {
          setPlaylist((prev) => {
            const appended = [...prev, randomTrack];
            setPlaylistIndex(appended.length - 1);
            return appended;
          });
        }
      } catch (err) {
        console.error('Failed to auto-play suggestion', err);
      }
    }
  }

  async function playPrevious() {
    const dev = deviceIdRef.current;
    if (!dev) return;
    const list = playlistRef.current;
    if (list.length === 0) return;

    let idx = playlistIndexRef.current;
    if (idx < 0) idx = 0;
    if (idx >= list.length) idx = list.length - 1;

    const prevIdx = idx - 1;
    if (prevIdx >= 0) {
      const ok = await startPlaybackUri(list[prevIdx].uri);
      if (ok) setPlaylistIndex(prevIdx);
    }
  }

  // Load room metadata over HTTP (works even if Socket.IO is slow or fails in Edge)
  useEffect(() => {
    if (!session || !roomId) return;
    let cancelled = false;

    fetch(`/api/rooms?id=${encodeURIComponent(roomId)}`, { credentials: 'include' })
      .then((res) => {
        if (cancelled) return null;
        if (res.status === 404) {
          setError('Room not found.');
          return null;
        }
        if (!res.ok) return null;
        return res.json();
      })
      .then((data) => {
        if (cancelled || !data) return;
        setRoom((prev) => ({
          roomId: data.id,
          title: data.title,
          owner: data.owner,
          settings: data.settings,
          users: prev?.users?.length ? prev.users : [],
          chat: data.chat || []
        }));
        setTheme(normalizeRoomSettings(data.settings));
        setError('');
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [session, roomId]);

  useEffect(() => {
    if (!session || !roomId) return;

    let active = true;
    const socket = io({
      autoConnect: false,
      withCredentials: true,
      transports: ['polling', 'websocket'],
      reconnection: true,
      reconnectionAttempts: 8,
      reconnectionDelay: 1000
    });
    socketRef.current = socket;

    const joinRoom = () => {
      if (active) socket.emit('join-room', roomId);
    };

    socket.on('connect', joinRoom);

    socket.on('connect_error', (err) => {
      if (!active) return;
      const msg = err.message || 'Connection failed';
      if (msg === 'AUTH_REQUIRED') {
        setError('Session expired — please sign in again.');
        return;
      }
      setError((prev) =>
        prev === 'Room not found.' ? prev : 'Live connection failed. Retrying…'
      );
    });

    socket.on('room-state', (state: RoomState) => {
      if (!active) return;
      setRoom(state);
      setTheme(normalizeRoomSettings(state.settings));
      setIsHost(state.owner?.id === sessionIdRef.current);
      setError('');
    });

    socket.on('chat-message', (message) => {
      if (!active) return;
      setRoom((prev) => (prev ? { ...prev, chat: [...prev.chat, message] } : prev));
    });

    socket.on('room-settings', (settings: RoomSettings) => {
      if (!active) return;
      const normalized = normalizeRoomSettings(settings);
      setTheme(normalized);
      setRoom((prev) => (prev ? { ...prev, settings: normalized } : prev));
    });

    socket.on('room-error', ({ message }) => {
      if (!active) return;
      setError(message);
    });

    socket.connect();

    return () => {
      active = false;
      socket.off('connect', joinRoom);
      socket.disconnect();
      socketRef.current = null;
    };
  }, [roomId, session]);

  const accent = useMemo(() => getAccentTheme(theme.accent), [theme.accent]);

  const panelShellClass = `rounded-3xl border p-5 shadow-lg backdrop-blur-md ${accent.panelBorder} ${accent.panelBg}`;
  const sectionShellClass = `rounded-3xl border p-6 shadow-lg backdrop-blur-md ${accent.sectionBorder} ${accent.sectionBg}`;
  const innerCardClass = `rounded-3xl border p-4 ${accent.innerBorder} ${accent.innerBg}`;

  function sendMessage() {
    if (!message.trim()) return;
    socketRef.current?.emit('send-message', { roomId, text: message });
    setMessage('');
  }

  function updateSettings(update: Partial<RoomSettings>) {
    const normalized = normalizeRoomSettings({ ...theme, ...update });
    setTheme(normalized);
    setRoom((prev) => (prev ? { ...prev, settings: normalized } : prev));
    socketRef.current?.emit('update-settings', { roomId, settings: update });
  }

  const pageBackdropStyle = pageBackgroundStyle(theme.backgroundImage);
  const hasPageBg = hasCustomBackground(theme);

  useEffect(() => {
    const root = document.documentElement;
    if (hasPageBg) {
      root.classList.add('wejam-custom-page-bg');
      document.body.classList.add('wejam-custom-page-bg');
    } else {
      root.classList.remove('wejam-custom-page-bg');
      document.body.classList.remove('wejam-custom-page-bg');
    }
    return () => {
      root.classList.remove('wejam-custom-page-bg');
      document.body.classList.remove('wejam-custom-page-bg');
    };
  }, [hasPageBg]);

  if (!sessionChecked) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-16 text-center text-slate-400">Loading secure session…</div>
    );
  }

  if (!session) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-16 text-center text-slate-400">Redirecting to sign in…</div>
    );
  }

  return (
    <>
      {lyricsVisible && (
        <LyricsPanel
          track={nowPlaying.track}
          positionMs={nowPlaying.positionMs}
          activeLineClass={accent.activeText}
          onClose={() => setLyricsVisible(false)}
        />
      )}

      {!lyricsVisible && (
        <button
          type="button"
          onClick={() => setLyricsVisible(true)}
          className={`fixed bottom-8 left-8 z-50 rounded-full px-4 py-3 text-2xl shadow-lg transition ${accent.floatBtn} ${accent.floatBtnHover}`}
          aria-label="Show lyrics"
          title="Lyrics"
        >
          🎵
        </button>
      )}

      {pageBackdropStyle ? (
        <div className="pointer-events-none fixed inset-0 z-0" style={pageBackdropStyle} aria-hidden />
      ) : null}

      <div className="relative z-10 mx-auto min-h-screen max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className={`grid gap-8 ${chatVisible ? 'lg:grid-cols-[1fr_380px]' : 'grid-cols-1'}`}>
        <section className={sectionShellClass}>
          <div className={`overflow-hidden rounded-3xl p-8 ${accent.header} bg-opacity-20`}>
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-sm uppercase tracking-[0.24em] text-slate-400">Joined room</p>
                <h1 className="mt-2 text-3xl font-semibold text-white">
                  {room?.title || 'Loading room…'}
                </h1>
                {theme.banner ? (
                  <p className="mt-2 text-sm font-medium text-slate-200/90">{theme.banner}</p>
                ) : null}
                <p className="mt-2 text-slate-300">Host: {room?.owner.displayName || '...'}</p>
                <p className="mt-2 text-sm text-slate-400">{playerStatus}</p>
              </div>
              <div className="flex flex-col items-end gap-2">
                <div
                  className={`rounded-3xl px-4 py-2 text-sm text-slate-300 ${
                    hasPageBg ? 'bg-black/40' : 'bg-slate-950/90'
                  }`}
                >
                  Room code: {roomId}
                </div>
                <button
                  type="button"
                  onClick={() => setCustomizeVisible((v) => !v)}
                  className={`rounded-full px-4 py-2 text-sm font-semibold text-white transition ${
                    hasPageBg ? 'bg-black/40 hover:bg-black/55' : 'bg-slate-950/90 hover:bg-slate-800'
                  }`}
                >
                  {customizeVisible ? 'Hide look' : '🎨 Customize'}
                </button>
              </div>
            </div>
          </div>

          {customizeVisible ? (
            <RoomCustomizePanel
              settings={theme}
              onApply={(update) => updateSettings(update)}
              onClose={() => setCustomizeVisible(false)}
            />
          ) : null}

          <div className="mt-8 grid gap-6 lg:grid-cols-[360px_minmax(0,1fr)]">
            <div className="space-y-4">
              <div className={panelShellClass}>
                <h2 className="text-lg font-semibold text-white">Playlist queue</h2>
                <div className="mt-4 space-y-3">
                  {playlist.length ? (
                    playlist.map((track, index) => (
                      <div
                        key={`${track.id}-${index}`}
                        className={`rounded-3xl border p-4 ${
                          index === playlistIndex
                            ? `${accent.activeBorder} ${accent.activeBg}`
                            : innerCardClass
                        }`}
                      >
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <p className={`font-semibold ${index === playlistIndex ? accent.activeText : 'text-white'}`}>
                              {index === playlistIndex ? '▶ ' : ''}{track.name}
                            </p>
                            <p className="text-sm text-slate-400">{track.artists.map((artist: any) => artist.name).join(', ')}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            {index < playlistIndex && (
                              <span className="rounded-full bg-slate-800 px-2 py-1 text-xs uppercase tracking-[0.18em] text-slate-400">Played</span>
                            )}
                            <button
                              onClick={() => removeFromPlaylist(index)}
                              className="rounded-full bg-rose-500 px-3 py-2 text-xs font-semibold text-slate-950 transition hover:bg-rose-400"
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-slate-400">No songs in the room playlist yet.</p>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-4">
              {accessToken ? (
                <div className={panelShellClass}>
                  <SpotifyPlayer
                    accessToken={accessToken}
                    accent={accent}
                    onReady={setDeviceId}
                    onNext={playNext}
                    onPrevious={playPrevious}
                    onStatusChange={setPlayerStatus}
                    onPlaybackUpdate={setNowPlaying}
                  />
                </div>
              ) : null}

              {accessToken && !deviceId ? (
                <div className="rounded-3xl border border-amber-500/20 bg-amber-500/5 p-4 text-sm text-amber-200">
                  Spotify player is not active yet. Allow the browser playback prompt and wait for the WeJam player device to appear in Spotify Connect.
                </div>
              ) : null}

              <div className={panelShellClass}>
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-lg font-semibold text-white">Search Spotify</h2>
                  {isSearchExpanded && (
                    <button
                      onClick={collapseSearch}
                      className="rounded-full bg-slate-800 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700"
                    >
                      Collapse
                    </button>
                  )}
                </div>
                {accessToken && !deviceId ? (
                  <p className="mt-2 text-sm text-amber-300">
                    Spotify player is not active yet. Open Spotify Connect and select the "WeJam Player" device, or wait until the browser player initializes.
                  </p>
                ) : null}
                <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                  <input
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    onKeyDown={(event) => event.key === 'Enter' && searchTracks()}
                    className={`min-w-0 flex-1 rounded-3xl border border-slate-700 bg-slate-900 px-4 py-3 text-slate-100 outline-none ${accent.focusRing}`}
                    placeholder="Search songs, artists, albums"
                  />
                  <button
                    onClick={searchTracks}
                    className={`rounded-3xl px-6 py-3 font-semibold text-slate-950 transition ${accent.btn} ${accent.btnHover}`}
                  >
                    Search
                  </button>
                </div>

                {isSearchExpanded && (
                  <div className="mt-5 space-y-3">
                    {searchResults.length ? (
                      searchResults.map((track) => (
                        <div key={track.id} className="rounded-3xl border border-slate-800 bg-slate-900/90 p-4">
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                              <p className="font-semibold text-white">{track.name}</p>
                              <p className="text-sm text-slate-400">{track.artists.map((artist: any) => artist.name).join(', ')}</p>
                            </div>
                            <div className="flex gap-2">
                              <button
                                onClick={() => addToPlaylist(track)}
                                className="rounded-full bg-slate-800 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700"
                              >
                                Add
                              </button>
                              <button
                                onClick={() => playTrack(track)}
                                className={`rounded-full px-4 py-2 text-sm font-semibold text-slate-950 ${accent.btn} ${accent.btnHover}`}
                              >
                                Play
                              </button>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-slate-400">Search for songs to add them to your playlist or play immediately.</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        {chatVisible && (
          <aside className={`flex h-fit flex-col lg:h-auto lg:max-h-screen ${panelShellClass}`}>
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-white">Chat</h2>
              <button
                onClick={() => setChatVisible(false)}
                className="rounded-full bg-slate-800 px-2 py-1 text-lg text-slate-300 hover:bg-slate-700"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 max-h-96 lg:max-h-[32rem] space-y-3 overflow-y-auto pr-2 scrollbar-thin">
              {room?.chat.length ? (
                room.chat.map((item) => (
                  <div key={item.id} className="rounded-2xl border border-slate-800 bg-slate-950/90 p-3">
                    <div className="flex items-center justify-between gap-2 text-xs text-slate-400">
                      <span className="font-medium truncate">{item.author}</span>
                      <span className="text-xs">{new Date(item.createdAt).toLocaleTimeString()}</span>
                    </div>
                    <p className="mt-1 text-sm text-slate-100">{item.text}</p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-400">No messages yet. Start the conversation.</p>
              )}
            </div>

            <div className="mt-4 flex flex-col gap-2">
              <input
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                onKeyDown={(event) => event.key === 'Enter' && sendMessage()}
                className={`w-full rounded-2xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none ${accent.focusRing}`}
                placeholder="Message"
              />
              <button
                onClick={sendMessage}
                className={`w-full rounded-2xl px-3 py-2 text-sm font-semibold text-slate-950 transition ${accent.btn} ${accent.btnHover}`}
              >
                Send
              </button>
            </div>
          </aside>
        )}

        {!chatVisible && (
          <button
            type="button"
            onClick={() => setChatVisible(true)}
            className={`fixed bottom-8 right-8 z-50 rounded-full px-4 py-3 text-2xl shadow-lg transition ${accent.floatBtn} ${accent.floatBtnHover}`}
            aria-label="Show chat"
            title="Chat"
          >
            💬
          </button>
        )}
      </div>

      {error ? (
        <div className="mt-6 rounded-3xl border border-rose-500/20 bg-rose-500/10 p-4 text-sm text-rose-200">
          {error}
        </div>
      ) : null}
      </div>
    </>
  );
}
