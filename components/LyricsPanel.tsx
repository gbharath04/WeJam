'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { getActiveLineIndex, parseLrc, plainLyricsToLines, type LyricLine } from '../lib/lrc';

type TrackInfo = {
  id?: string;
  name: string;
  artists: Array<{ name: string }>;
  album?: { name?: string };
  duration_ms?: number;
};

interface Props {
  track: TrackInfo | null;
  positionMs: number;
  activeLineClass?: string;
  onClose: () => void;
}

export default function LyricsPanel({
  track,
  positionMs,
  activeLineClass = 'text-emerald-300',
  onClose
}: Props) {
  const [lines, setLines] = useState<LyricLine[]>([]);
  const [synced, setSynced] = useState(false);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const lineRefs = useRef<Array<HTMLParagraphElement | null>>([]);

  const activeIndex = useMemo(
    () => (synced ? getActiveLineIndex(lines, positionMs) : -1),
    [lines, positionMs, synced]
  );

  useEffect(() => {
    if (!track?.name) {
      setLines([]);
      setStatus('Play a song to see lyrics.');
      return;
    }

    const artist = track.artists?.map((a) => a.name).join(', ') || '';
    const durationSec = track.duration_ms ? String(Math.round(track.duration_ms / 1000)) : '';
    const params = new URLSearchParams({
      track: track.name,
      artist
    });
    if (track.album?.name) params.set('album', track.album.name);
    if (durationSec) params.set('duration', durationSec);

    let cancelled = false;
    setLoading(true);
    setStatus('Loading lyrics…');

    fetch(`/api/lyrics?${params.toString()}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled) return;
        if (!data?.synced && !data?.plain) {
          setLines([]);
          setSynced(false);
          setStatus('No lyrics found for this track.');
          return;
        }
        if (data.synced) {
          const parsed = parseLrc(data.synced);
          setLines(parsed.length ? parsed : plainLyricsToLines(data.plain || ''));
          setSynced(parsed.length > 0);
        } else {
          setLines(plainLyricsToLines(data.plain));
          setSynced(false);
        }
        setStatus('');
      })
      .catch(() => {
        if (!cancelled) {
          setLines([]);
          setStatus('Could not load lyrics.');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [track?.id, track?.name, track?.album?.name, track?.duration_ms]);

  useEffect(() => {
    if (!synced || activeIndex < 0) return;
    const el = lineRefs.current[activeIndex];
    if (el && scrollRef.current) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [activeIndex, synced]);

  return (
    <aside
      className="fixed inset-y-0 left-0 z-50 flex w-[min(340px,88vw)] flex-col border-r border-slate-700/40 bg-slate-950/75 p-5 shadow-2xl backdrop-blur-md"
      aria-label="Lyrics panel"
    >
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-lg font-semibold text-white">Lyrics</h2>
          {track ? (
            <p className="mt-1 truncate text-sm text-slate-400">
              {track.name} · {track.artists?.map((a) => a.name).join(', ')}
            </p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="shrink-0 rounded-full bg-slate-800/80 px-2 py-1 text-lg text-slate-300 hover:bg-slate-700"
          aria-label="Close lyrics"
        >
          ✕
        </button>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto pr-2 scrollbar-thin">
        {loading ? (
          <p className="text-sm text-slate-400">{status}</p>
        ) : lines.length ? (
          <div className="space-y-3 py-2">
            {lines.map((line, index) => (
              <p
                key={`${line.timeMs}-${index}`}
                ref={(el) => {
                  lineRefs.current[index] = el;
                }}
                className={`text-base leading-relaxed transition-colors ${
                  synced && index === activeIndex
                    ? `font-semibold ${activeLineClass}`
                    : synced && index < activeIndex
                      ? 'text-slate-500'
                      : 'text-slate-200/90'
                }`}
              >
                {line.text}
              </p>
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-400">{status || 'No lyrics to show.'}</p>
        )}
      </div>
    </aside>
  );
}
