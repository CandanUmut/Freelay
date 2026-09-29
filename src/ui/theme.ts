import { useEffect, useState } from 'react'

/**
 * Two palettes. Mark colours (layers, good/bad) are identical in both and
 * were validated for colour-vision deficiency on both surfaces; only
 * surfaces, lines and text change. Tailwind reads these as CSS variables.
 */
export type ThemeName = 'light' | 'dark'
export type ThemeSetting = ThemeName | 'system'

export interface Palette {
  bg: string
  surface: string
  surface2: string
  line: string
  ink: string
  muted: string
  abstinenceInk: string
  boundaryInk: string
  selfcareInk: string
  goodInk: string
  badInk: string
  /** Empty heatmap / calendar cell. */
  empty: string
}

export const MARKS = {
  abstinence: '#5a67d8',
  boundary: '#b8791c',
  selfcare: '#8e59c9',
  /** Validated pair (deutan ΔE 8.5); setbacks also carry a hatch so colour is never the only cue. */
  good: '#22a06b',
  bad: '#c9372c',
} as const

export const PALETTES: Record<ThemeName, Palette> = {
  light: {
    bg: '#f5f3ee',
    surface: '#ffffff',
    surface2: '#eeebe4',
    line: '#e2ded5',
    ink: '#1f1e1c',
    muted: '#6d6a64',
    abstinenceInk: '#4351b8',
    boundaryInk: '#8a5a0f',
    selfcareInk: '#7040a8',
    goodInk: '#16784f',
    badInk: '#a82d24',
    empty: '#ece9e2',
  },
  dark: {
    bg: '#1c1e21',
    surface: '#25282c',
    surface2: '#30343a',
    line: '#373b41',
    ink: '#ececea',
    muted: '#a19f9a',
    abstinenceInk: '#aab2f0',
    boundaryInk: '#dcb368',
    selfcareInk: '#c7a8ec',
    goodInk: '#6fd3a3',
    badInk: '#f08c80',
    empty: '#2c2f34',
  },
}

const VARS: Record<keyof Palette, string> = {
  bg: '--color-bg',
  surface: '--color-surface',
  surface2: '--color-surface-2',
  line: '--color-line',
  ink: '--color-ink',
  muted: '--color-muted',
  abstinenceInk: '--color-abstinence-ink',
  boundaryInk: '--color-boundary-ink',
  selfcareInk: '--color-selfcare-ink',
  goodInk: '--color-good-ink',
  badInk: '--color-bad-ink',
  empty: '--color-empty',
}

const STORAGE_KEY = 'ledger-theme'

export function applyTheme(name: ThemeName) {
  const root = document.documentElement
  const p = PALETTES[name]
  for (const [k, v] of Object.entries(VARS)) root.style.setProperty(v, p[k as keyof Palette])
  root.style.colorScheme = name
  root.dataset.theme = name
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', p.bg)
  try {
    // Remembered only so the next launch paints the right colours before the database opens.
    localStorage.setItem(STORAGE_KEY, name)
  } catch {
    /* storage unavailable: the first frame may just use the light default */
  }
}

/** Apply the last used theme immediately at startup, before data loads. */
export function applyStoredTheme() {
  try {
    const t = localStorage.getItem(STORAGE_KEY)
    if (t === 'dark' || t === 'light') applyTheme(t)
  } catch {
    /* ignore */
  }
}

function systemDark(): boolean {
  return typeof matchMedia === 'function' && matchMedia('(prefers-color-scheme: dark)').matches
}

/** Resolve the setting against the system preference, and follow system changes live. */
export function useResolvedTheme(setting: ThemeSetting): ThemeName {
  const [sysDark, setSysDark] = useState(systemDark)
  useEffect(() => {
    if (typeof matchMedia !== 'function') return
    const mq = matchMedia('(prefers-color-scheme: dark)')
    const on = () => setSysDark(mq.matches)
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [])
  return setting === 'system' ? (sysDark ? 'dark' : 'light') : setting
}
