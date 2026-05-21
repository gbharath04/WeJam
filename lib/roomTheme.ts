import type { CSSProperties } from 'react';
import type { RoomSettings } from './roomSettings';

function cleanUrl(url: string) {
  return url.trim().replace(/"/g, '\\"');
}

function plainImageStyle(url: string, fixed = false): CSSProperties {
  const safe = cleanUrl(url);
  return {
    backgroundImage: `url("${safe}")`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundRepeat: 'no-repeat',
    ...(fixed ? { backgroundAttachment: 'fixed' as const } : {})
  };
}

/** Full-page backdrop — image only, no color overlay */
export function pageBackgroundStyle(url: string | undefined): CSSProperties | undefined {
  const trimmed = url?.trim();
  if (!trimmed) return undefined;
  return plainImageStyle(trimmed, true);
}

/** Inner cards — image only */
export function cardBackgroundStyle(url: string | undefined): CSSProperties | undefined {
  const trimmed = url?.trim();
  if (!trimmed) return undefined;
  return plainImageStyle(trimmed);
}

/** Jam room header banner — image only */
export function roomHeaderBackgroundStyle(url: string | undefined): CSSProperties | undefined {
  const trimmed = url?.trim();
  if (!trimmed) return undefined;
  return plainImageStyle(trimmed);
}

export function hasCustomBackground(settings: RoomSettings): boolean {
  return Boolean(settings.backgroundImage?.trim());
}

export type { RoomSettings };
