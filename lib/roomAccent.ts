export const ACCENT_IDS = ['indigo', 'emerald', 'cyan', 'rose', 'pink'] as const;
export type AccentId = (typeof ACCENT_IDS)[number];

export type AccentTheme = {
  id: AccentId;
  header: string;
  panelBorder: string;
  panelBg: string;
  sectionBorder: string;
  sectionBg: string;
  innerBorder: string;
  innerBg: string;
  activeBorder: string;
  activeBg: string;
  activeText: string;
  btn: string;
  btnHover: string;
  focusRing: string;
  rangeAccent: string;
  floatBtn: string;
  floatBtnHover: string;
};

const THEMES: Record<AccentId, AccentTheme> = {
  indigo: {
    id: 'indigo',
    header: 'bg-indigo-500',
    panelBorder: 'border-indigo-500/40',
    panelBg: 'bg-indigo-950/68',
    sectionBorder: 'border-indigo-500/35',
    sectionBg: 'bg-indigo-950/58',
    innerBorder: 'border-indigo-500/25',
    innerBg: 'bg-indigo-950/70',
    activeBorder: 'border-indigo-400',
    activeBg: 'bg-indigo-500/25',
    activeText: 'text-indigo-300',
    btn: 'bg-indigo-500',
    btnHover: 'hover:bg-indigo-400',
    focusRing: 'focus:border-indigo-400',
    rangeAccent: 'accent-indigo-500',
    floatBtn: 'bg-indigo-500',
    floatBtnHover: 'hover:bg-indigo-400'
  },
  emerald: {
    id: 'emerald',
    header: 'bg-emerald-500',
    panelBorder: 'border-emerald-500/40',
    panelBg: 'bg-emerald-950/68',
    sectionBorder: 'border-emerald-500/35',
    sectionBg: 'bg-emerald-950/58',
    innerBorder: 'border-emerald-500/25',
    innerBg: 'bg-emerald-950/70',
    activeBorder: 'border-emerald-400',
    activeBg: 'bg-emerald-500/25',
    activeText: 'text-emerald-300',
    btn: 'bg-emerald-500',
    btnHover: 'hover:bg-emerald-400',
    focusRing: 'focus:border-emerald-400',
    rangeAccent: 'accent-emerald-500',
    floatBtn: 'bg-emerald-500',
    floatBtnHover: 'hover:bg-emerald-400'
  },
  cyan: {
    id: 'cyan',
    header: 'bg-cyan-500',
    panelBorder: 'border-cyan-500/40',
    panelBg: 'bg-cyan-950/68',
    sectionBorder: 'border-cyan-500/35',
    sectionBg: 'bg-cyan-950/58',
    innerBorder: 'border-cyan-500/25',
    innerBg: 'bg-cyan-950/70',
    activeBorder: 'border-cyan-400',
    activeBg: 'bg-cyan-500/25',
    activeText: 'text-cyan-300',
    btn: 'bg-cyan-500',
    btnHover: 'hover:bg-cyan-400',
    focusRing: 'focus:border-cyan-400',
    rangeAccent: 'accent-cyan-500',
    floatBtn: 'bg-cyan-500',
    floatBtnHover: 'hover:bg-cyan-400'
  },
  rose: {
    id: 'rose',
    header: 'bg-rose-500',
    panelBorder: 'border-rose-500/40',
    panelBg: 'bg-rose-950/68',
    sectionBorder: 'border-rose-500/35',
    sectionBg: 'bg-rose-950/58',
    innerBorder: 'border-rose-500/25',
    innerBg: 'bg-rose-950/70',
    activeBorder: 'border-rose-400',
    activeBg: 'bg-rose-500/25',
    activeText: 'text-rose-300',
    btn: 'bg-rose-500',
    btnHover: 'hover:bg-rose-400',
    focusRing: 'focus:border-rose-400',
    rangeAccent: 'accent-rose-500',
    floatBtn: 'bg-rose-500',
    floatBtnHover: 'hover:bg-rose-400'
  },
  pink: {
    id: 'pink',
    header: 'bg-pink-500',
    panelBorder: 'border-pink-500/40',
    panelBg: 'bg-pink-950/68',
    sectionBorder: 'border-pink-500/35',
    sectionBg: 'bg-pink-950/58',
    innerBorder: 'border-pink-500/25',
    innerBg: 'bg-pink-950/70',
    activeBorder: 'border-pink-400',
    activeBg: 'bg-pink-500/25',
    activeText: 'text-pink-300',
    btn: 'bg-pink-500',
    btnHover: 'hover:bg-pink-400',
    focusRing: 'focus:border-pink-400',
    rangeAccent: 'accent-pink-500',
    floatBtn: 'bg-pink-500',
    floatBtnHover: 'hover:bg-pink-400'
  }
};

export function getAccentTheme(accent: string): AccentTheme {
  if (ACCENT_IDS.includes(accent as AccentId)) {
    return THEMES[accent as AccentId];
  }
  return THEMES.indigo;
}
