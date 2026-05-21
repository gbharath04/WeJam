import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'WeJam — Jam + Chat',
  description: 'Spotify-ready audio jam rooms with chat and customizable UI.'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
