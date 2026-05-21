const DEFAULT_ROOM_SETTINGS = {
  accent: 'indigo',
  banner: '',
  layout: 'grid',
  backgroundImage: '',
  cardImage: '',
  roomCardImage: ''
};

const ACCENTS = new Set(['indigo', 'emerald', 'cyan', 'rose', 'pink']);
const LAYOUTS = new Set(['grid', 'stack']);

function isValidImageUrl(url) {
  if (typeof url !== 'string') return false;
  const trimmed = url.trim();
  if (!trimmed) return true;
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol === 'https:' || parsed.protocol === 'http:') return true;
    if (parsed.protocol === 'data:' && /^data:image\//i.test(trimmed)) return true;
    return false;
  } catch {
    return false;
  }
}

function sanitizeRoomSettings(partial) {
  if (!partial || typeof partial !== 'object') return {};
  const out = {};

  if (typeof partial.accent === 'string' && ACCENTS.has(partial.accent)) {
    out.accent = partial.accent;
  }
  if (typeof partial.layout === 'string' && LAYOUTS.has(partial.layout)) {
    out.layout = partial.layout;
  }
  if (typeof partial.banner === 'string') {
    out.banner = partial.banner.trim().slice(0, 120);
  }

  for (const key of ['backgroundImage', 'cardImage', 'roomCardImage']) {
    if (typeof partial[key] !== 'string') continue;
    const value = partial[key].trim();
    if (!value) {
      out[key] = '';
      continue;
    }
    if (isValidImageUrl(value)) {
      out[key] = value.slice(0, 2048);
    }
  }

  return out;
}

function normalizeRoomSettings(settings) {
  const base = { ...DEFAULT_ROOM_SETTINGS };
  if (!settings || typeof settings !== 'object') return base;
  const merged = { ...base, ...settings };
  if (!ACCENTS.has(merged.accent)) merged.accent = 'indigo';
  if (!LAYOUTS.has(merged.layout)) merged.layout = 'grid';
  for (const key of ['backgroundImage', 'cardImage', 'roomCardImage']) {
    if (!isValidImageUrl(merged[key] || '')) merged[key] = '';
  }
  return merged;
}

module.exports = {
  DEFAULT_ROOM_SETTINGS,
  sanitizeRoomSettings,
  normalizeRoomSettings
};
