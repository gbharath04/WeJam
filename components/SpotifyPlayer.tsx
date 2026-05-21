'use client';

import { useEffect, useRef, useState } from 'react';
import type { AccentTheme } from '../lib/roomAccent';

export type PlaybackUpdate = {
  track: any;
  positionMs: number;
  durationMs: number;
  isPlaying: boolean;
};

function formatTime(ms: number) {
  if (!Number.isFinite(ms) || ms < 0) return '0:00';
  const totalSec = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSec / 60);
  const seconds = totalSec % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

interface Props {
  accessToken: string;
  accent?: AccentTheme;
  onReady?: (deviceId: string) => void;
  onNext?: () => void;
  onPrevious?: () => void;
  onStatusChange?: (status: string) => void;
  onPlaybackUpdate?: (update: PlaybackUpdate) => void;
}

export default function SpotifyPlayer({
  accessToken,
  accent,
  onReady,
  onNext,
  onPrevious,
  onStatusChange,
  onPlaybackUpdate
}: Props) {
  const [deviceId, setDeviceId] = useState('');
  const [playerReady, setPlayerReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTrack, setCurrentTrack] = useState<any>(null);
  const [positionMs, setPositionMs] = useState(0);
  const [durationMs, setDurationMs] = useState(0);
  const [scrubMs, setScrubMs] = useState(0);
  const [statusMessage, setStatusMessage] = useState('Waiting for Spotify player...');
  const playerRef = useRef<any>(null);
  const isSeekingRef = useRef(false);

  const publishPlayback = (
    track: any,
    position: number,
    duration: number,
    playing: boolean
  ) => {
    if (!isSeekingRef.current) {
      setPositionMs(position);
      setScrubMs(position);
    }
    setDurationMs(duration);
    setCurrentTrack(track);
    setIsPlaying(playing);
    onPlaybackUpdate?.({ track, positionMs: position, durationMs: duration, isPlaying: playing });
  };

  const updateStatus = (message: string) => {
    setStatusMessage(message);
    onStatusChange?.(message);
  };

  useEffect(() => {
    updateStatus('Waiting for Spotify player...');
  }, []);

  // Spotify only emits player_state_changed on play/pause/seek/track change — poll while playing for lyrics + scrubber.
  useEffect(() => {
    if (!playerReady || !isPlaying) return;

    const tick = () => {
      if (isSeekingRef.current) return;
      const p = playerRef.current;
      if (!p) return;

      void p
        .getCurrentState()
        .then((state: any) => {
          if (!state || state.paused) return;
          const track = state.track_window?.current_track || null;
          const duration = state.duration ?? track?.duration_ms ?? 0;
          publishPlayback(track, state.position ?? 0, duration, true);
        })
        .catch(() => {});
    };

    tick();
    const id = window.setInterval(tick, 250);
    return () => window.clearInterval(id);
  }, [playerReady, isPlaying]);

  useEffect(() => {
    if (!accessToken) return;

    updateStatus('Loading Spotify SDK...');
    let player: any = null;
    const sdkReady = () => typeof (window as any).Spotify !== 'undefined';

    let authRetryInFlight = false;

    const initPlayer = () => {
      if (playerRef.current) return;

    async function fetchAccessToken(): Promise<string | null> {
      try {
        let response = await fetch('/api/spotify/token', { credentials: 'include' });
        if (response.ok) {
          const data = await response.json();
          return data.accessToken || null;
        }
        if (response.status === 401) {
          response = await fetch('/api/spotify/refresh', {
            method: 'POST',
            credentials: 'include'
          });
          if (response.ok) {
            const data = await response.json();
            return data.accessToken || null;
          }
        }
      } catch {
        /* fall through */
      }
      return null;
    }

    const transferPlayback = async (deviceId: string) => {
      const token = await fetchAccessToken();
      if (!token) return;
      try {
        await fetch('https://api.spotify.com/v1/me/player', {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ device_ids: [deviceId], play: false })
        });
      } catch (err) {
        console.warn('Playback transfer failed', err);
      }
    };

      player = new (window as any).Spotify.Player({
        name: 'WeJam Player',
        getOAuthToken: (cb: Function) => {
          void fetchAccessToken().then((token) => {
            if (token) {
              cb(token);
            } else {
              updateStatus('Spotify auth error: sign out and sign in again from home.');
            }
          });
        },
        volume: 0.5
      });

      player.addListener('player_state_changed', (state: any) => {
        if (!state) {
          setCurrentTrack(null);
          setIsPlaying(false);
          setPositionMs(0);
          setScrubMs(0);
          setDurationMs(0);
          onPlaybackUpdate?.({ track: null, positionMs: 0, durationMs: 0, isPlaying: false });
          updateStatus('Player is initialized but no track is playing yet.');
          return;
        }

        const track = state.track_window?.current_track || null;
        const duration = state.duration ?? track?.duration_ms ?? 0;
        publishPlayback(track, state.position ?? 0, duration, !state.paused);
        updateStatus('Spotify player is active.');
      });

      player.addListener('autoplay_failed', () => {
        updateStatus('Browser blocked autoplay — use Play/Pause here to unlock audio.');
      });

      player.addListener('playback_error', ({ message }: { message: string }) => {
        console.warn('Spotify playback_error', message);
        updateStatus(`Playback error: ${message}`);
      });

      player.addListener('ready', async ({ device_id }: any) => {
        console.log('Ready with Device ID', device_id);
        setDeviceId(device_id);
        setPlayerReady(true);
        updateStatus('Spotify player is ready.');
        onReady?.(device_id);
        await transferPlayback(device_id);
        const state = await player.getCurrentState();
        if (state) {
          const track = state.track_window?.current_track || null;
          const duration = state.duration ?? track?.duration_ms ?? 0;
          publishPlayback(track, state.position ?? 0, duration, !state.paused);
        }
      });

      player.addListener('not_ready', ({ device_id }: any) => {
        console.log('Device ID has gone offline', device_id);
        setPlayerReady(false);
        updateStatus('Spotify player disconnected. Please refresh or retry.');
      });

      player.addListener('initialization_error', ({ message }: any) => {
        updateStatus(`Spotify SDK init error: ${message}`);
      });
      player.addListener('authentication_error', ({ message }: any) => {
        if (authRetryInFlight) {
          updateStatus(`Spotify auth error: ${message}. Sign out and sign in again from home.`);
          return;
        }
        authRetryInFlight = true;
        updateStatus('Refreshing Spotify session...');
        void fetchAccessToken().then((token) => {
          authRetryInFlight = false;
          if (!token) {
            updateStatus(`Spotify auth error: ${message}. Sign out and sign in again from home.`);
            return;
          }
          try {
            player.disconnect();
          } catch {
            /* ignore */
          }
          playerRef.current = null;
          initPlayer();
        });
      });
      player.addListener('account_error', ({ message }: any) => {
        updateStatus(`Spotify account error: ${message}`);
      });

      player.connect();
      playerRef.current = player;
    };

    const previousReady = (window as any).onSpotifyWebPlaybackSDKReady;
    (window as any).onSpotifyWebPlaybackSDKReady = () => {
      initPlayer();
      previousReady?.();
    };

    if (sdkReady()) {
      initPlayer();
    } else {
      const existing = document.querySelector('script[data-wejam-spotify-sdk]');
      if (!existing) {
        const script = document.createElement('script');
        script.src = 'https://sdk.scdn.co/spotify-player.js';
        script.async = true;
        script.setAttribute('data-wejam-spotify-sdk', 'true');
        document.body.appendChild(script);
      }
    }

    return () => {
      playerRef.current = null;
      if (player) {
        player.disconnect();
        player = null;
      }
    };
  }, [accessToken]);

  async function handleSeekCommit(position: number) {
    const p = playerRef.current;
    if (!p || durationMs <= 0) return;
    const clamped = Math.max(0, Math.min(position, durationMs));
    try {
      await p.activateElement();
      await p.seek(clamped);
      setPositionMs(clamped);
      setScrubMs(clamped);
      onPlaybackUpdate?.({
        track: currentTrack,
        positionMs: clamped,
        durationMs,
        isPlaying
      });
    } catch (err) {
      console.warn('seek failed', err);
      updateStatus('Could not seek — try again.');
    } finally {
      isSeekingRef.current = false;
    }
  }

  async function handleTogglePlayback() {
    const p = playerRef.current;
    if (!p) {
      updateStatus('Player is not ready yet.');
      return;
    }
    try {
      await p.activateElement();
    } catch {
      /* Some browsers still allow togglePlay without this */
    }
    try {
      await p.togglePlay();
    } catch (err) {
      console.warn('togglePlay failed', err);
      updateStatus('Could not toggle play/pause — try again or pick WeJam Player in Spotify Connect.');
    }
  }

  const playBtn = accent ? `${accent.btn} ${accent.btnHover}` : 'bg-emerald-500 hover:bg-emerald-400';
  const rangeAccent = accent?.rangeAccent ?? 'accent-emerald-500';

  return (
    <div className="p-5">
      <h3 className="text-lg font-semibold text-white">Now Playing</h3>
      {currentTrack ? (
        <div className="mt-4 space-y-2">
          <p className="text-slate-300">{currentTrack.name}</p>
          <p className="text-sm text-slate-400">
            {currentTrack.artists.map((a: any) => a.name).join(', ')}
          </p>
        </div>
      ) : (
        <p className="mt-4 text-sm text-slate-400">No track on this player yet</p>
      )}

      {playerReady ? (
        <>
          <div className="mt-5 space-y-2">
            <input
              type="range"
              min={0}
              max={Math.max(durationMs, 1)}
              step={500}
              value={Math.min(scrubMs, Math.max(durationMs, 1))}
              disabled={!currentTrack || durationMs <= 0}
              aria-label="Seek track position"
              className={`h-2 w-full cursor-pointer appearance-none rounded-full bg-slate-800 ${rangeAccent} disabled:cursor-not-allowed disabled:opacity-40`}
              onPointerDown={() => {
                isSeekingRef.current = true;
              }}
              onChange={(event) => {
                setScrubMs(Number(event.target.value));
              }}
              onPointerUp={(event) => {
                void handleSeekCommit(Number(event.currentTarget.value));
              }}
              onKeyUp={(event) => {
                if (event.key === 'Enter') {
                  void handleSeekCommit(Number(event.currentTarget.value));
                }
              }}
            />
            <div className="flex justify-between text-xs tabular-nums text-slate-400">
              <span>{formatTime(scrubMs)}</span>
              <span>{formatTime(durationMs)}</span>
            </div>
          </div>

          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={() => onPrevious?.()}
              className="rounded-full bg-slate-800 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700"
            >
              ⏮
            </button>
            <button
              type="button"
              onClick={() => void handleTogglePlayback()}
              className={`rounded-full px-4 py-2 text-sm font-semibold text-slate-950 ${playBtn}`}
              aria-label={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? '⏸' : '▶'}
            </button>
            <button
              type="button"
              onClick={() => onNext?.()}
              className="rounded-full bg-slate-800 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700"
            >
              ⏭
            </button>
          </div>
        </>
      ) : null}
    </div>
  );
}
