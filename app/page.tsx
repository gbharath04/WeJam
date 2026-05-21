'use client';

import { useEffect, useState } from 'react';
import AuthGate from '../components/AuthGate';
import RoomDashboard from '../components/RoomDashboard';

export default function Home() {
  const [profile, setProfile] = useState<any>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    fetch('/api/session')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        setProfile(data?.profile || null);
        setReady(true);
      })
      .catch(() => setReady(true));
  }, []);

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto flex min-h-screen max-w-6xl flex-col px-4 py-8 sm:px-6 lg:px-8">
        <header className="mb-10 rounded-3xl border border-slate-800 bg-slate-900/90 p-8 shadow-soft backdrop-blur">
          <h1 className="text-4xl font-semibold tracking-tight text-white sm:text-5xl">WeJam</h1>
          <p className="mt-4 max-w-2xl text-slate-300">Create Spotify Premium jam rooms and chat in real time with responsive customization controls for hosts.</p>
        </header>

        {!ready ? (
          <div className="mt-20 text-center text-slate-400">Loading secure session…</div>
        ) : profile ? (
          <RoomDashboard profile={profile} />
        ) : (
          <AuthGate />
        )}
      </div>
    </main>
  );
}
