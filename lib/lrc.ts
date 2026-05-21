export type LyricLine = { timeMs: number; text: string };

export function parseLrc(lrc: string): LyricLine[] {
  const lines: LyricLine[] = [];
  for (const raw of lrc.split('\n')) {
    const trimmed = raw.trim();
    if (!trimmed) continue;
    const match = trimmed.match(/^\[(\d+):(\d+(?:\.\d+)?)\]\s*(.*)$/);
    if (!match) continue;
    const minutes = parseInt(match[1], 10);
    const seconds = parseFloat(match[2]);
    const text = match[3].trim();
    if (!text) continue;
    lines.push({ timeMs: Math.round((minutes * 60 + seconds) * 1000), text });
  }
  return lines.sort((a, b) => a.timeMs - b.timeMs);
}

export function getActiveLineIndex(lines: LyricLine[], positionMs: number): number {
  if (!lines.length) return -1;
  let active = 0;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].timeMs <= positionMs) active = i;
    else break;
  }
  return active;
}

export function plainLyricsToLines(plain: string): LyricLine[] {
  return plain
    .split('\n')
    .map((text) => text.trim())
    .filter(Boolean)
    .map((text, index) => ({ timeMs: index, text }));
}
