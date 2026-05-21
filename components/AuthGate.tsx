export default function AuthGate() {
  return (
    <div className="mx-auto w-full max-w-3xl rounded-3xl border border-slate-800 bg-slate-900/90 p-8 shadow-soft">
      <h2 className="text-3xl font-semibold text-white">Spotify Premium required</h2>
      <p className="mt-4 text-slate-300">Sign in with Spotify Premium to create or join a live jam room with chat.</p>
      <div className="mt-8 flex flex-col gap-4 sm:flex-row">
        <a
          className="inline-flex items-center justify-center rounded-2xl bg-emerald-500 px-6 py-3 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400"
          href="/api/auth/spotify"
        >
          Sign in with Spotify
        </a>
      </div>
    </div>
  );
}
