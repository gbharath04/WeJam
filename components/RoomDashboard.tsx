'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface Props {
  profile: any;
}

export default function RoomDashboard({ profile }: Props) {
  const router = useRouter();
  const [title, setTitle] = useState(`${profile.display_name}'s Jam Room`);
  const [roomId, setRoomId] = useState('');
  const [error, setError] = useState('');

  async function createRoom() {
    setError('');
    const response = await fetch('/api/rooms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title })
    });
    const data = await response.json();
    if (!response.ok) {
      setError(data.error || 'Unable to create room.');
      return;
    }
    router.push(`/room/${data.room.id}`);
  }

  function joinRoom() {
    if (roomId.trim().length < 3) {
      setError('Enter a valid room code.');
      return;
    }
    router.push(`/room/${roomId.trim()}`);
  }

  return (
    <section className="grid gap-8 lg:grid-cols-[1.4fr_1fr]">
      <div className="rounded-3xl border border-slate-800 bg-slate-900/90 p-8 shadow-soft">
        <div className="flex flex-col gap-4">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-emerald-400">Welcome back</p>
            <h2 className="mt-2 text-3xl font-semibold text-white">{profile.display_name}</h2>
            <p className="mt-3 text-slate-300">Create your Spotify jam room and invite others with the room code.</p>
          </div>

          <div className="space-y-4">
            <label className="block text-sm font-medium text-slate-300">Room title</label>
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              className="w-full rounded-3xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-100 outline-none transition focus:border-emerald-400"
              placeholder="Enter a room title"
            />
            <button
              onClick={createRoom}
              className="inline-flex items-center justify-center rounded-3xl bg-emerald-500 px-6 py-3 font-semibold text-slate-950 transition hover:bg-emerald-400"
            >
              Create Jam Room
            </button>
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-slate-800 bg-slate-900/90 p-8 shadow-soft">
        <h3 className="text-xl font-semibold text-white">Join an existing room</h3>
        <p className="mt-2 text-slate-300">Paste the room code shared by the host and connect instantly.</p>
        <div className="mt-6 space-y-4">
          <input
            value={roomId}
            onChange={(event) => setRoomId(event.target.value)}
            className="w-full rounded-3xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-100 outline-none transition focus:border-cyan-400"
            placeholder="Room code"
          />
          <button
            onClick={joinRoom}
            className="inline-flex items-center justify-center rounded-3xl bg-sky-500 px-6 py-3 font-semibold text-slate-950 transition hover:bg-sky-400"
          >
            Join Room
          </button>
          {error ? <p className="text-sm text-rose-400">{error}</p> : null}
        </div>
      </div>
    </section>
  );
}
