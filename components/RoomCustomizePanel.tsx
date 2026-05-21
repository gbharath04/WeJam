'use client';

import { useEffect, useState } from 'react';
import { DEFAULT_ROOM_SETTINGS, type RoomSettings } from '../lib/roomSettings';

const ACCENT_OPTIONS = [
  { id: 'indigo', label: 'Indigo' },
  { id: 'emerald', label: 'Emerald' },
  { id: 'cyan', label: 'Cyan' },
  { id: 'rose', label: 'Rose' },
  { id: 'pink', label: 'Pink' }
] as const;

interface Props {
  settings: RoomSettings;
  onApply: (update: Partial<RoomSettings>) => void;
  onClose: () => void;
}

export default function RoomCustomizePanel({ settings, onApply, onClose }: Props) {
  const [draft, setDraft] = useState<RoomSettings>(settings);

  useEffect(() => {
    setDraft(settings);
  }, [settings]);

  function patch(update: Partial<RoomSettings>) {
    setDraft((prev) => ({ ...prev, ...update }));
  }

  return (
    <div className="mt-6 rounded-3xl border border-slate-700/80 bg-slate-950/90 p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-white">Customize look</h2>
          <p className="mt-1 text-sm text-slate-400">
            Background is full-page only. Playlist, player, search, and chat use the accent color below.
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-full bg-slate-800 px-2 py-1 text-lg text-slate-300 hover:bg-slate-700"
          aria-label="Close customize panel"
        >
          ✕
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block sm:col-span-2">
          <span className="text-sm font-medium text-slate-300">Background image URL</span>
          <input
            value={draft.backgroundImage}
            onChange={(e) => patch({ backgroundImage: e.target.value })}
            placeholder="https://… (full page only — not playlist, player, or search)"
            className="mt-2 w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-2.5 text-sm text-slate-100 outline-none focus:border-cyan-400"
          />
        </label>

        <label className="block sm:col-span-2">
          <span className="text-sm font-medium text-slate-300">Header tagline (optional)</span>
          <input
            value={draft.banner}
            onChange={(e) => patch({ banner: e.target.value })}
            placeholder="e.g. Friday night vibes"
            className="mt-2 w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-2.5 text-sm text-slate-100 outline-none focus:border-cyan-400"
          />
        </label>

        <label className="block">
          <span className="text-sm font-medium text-slate-300">Accent color</span>
          <select
            value={draft.accent}
            onChange={(e) => patch({ accent: e.target.value })}
            className="mt-2 w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-2.5 text-sm text-slate-100 outline-none focus:border-cyan-400"
          >
            {ACCENT_OPTIONS.map((opt) => (
              <option key={opt.id} value={opt.id}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <p className="mt-3 text-xs text-slate-500">
        Use direct image links (https://). Leave blank to use the default look.
      </p>

      <div className="mt-5 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() =>
            onApply({
              ...draft,
              cardImage: '',
              roomCardImage: ''
            })
          }
          className="rounded-2xl bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-slate-950 hover:bg-emerald-400"
        >
          Apply for everyone
        </button>
        <button
          type="button"
          onClick={() => {
            setDraft(DEFAULT_ROOM_SETTINGS);
            onApply({ ...DEFAULT_ROOM_SETTINGS, cardImage: '', roomCardImage: '' });
          }}
          className="rounded-2xl bg-slate-800 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-700"
        >
          Reset defaults
        </button>
      </div>
    </div>
  );
}
