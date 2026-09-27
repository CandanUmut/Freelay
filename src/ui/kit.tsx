import type { ButtonHTMLAttributes, ReactNode } from 'react'
import type { Layer } from '../db/types'
import { IconBack, IconClose } from './icons'

export const pct = (x: number | null | undefined) => (x === null || x === undefined ? '—' : `${Math.round(x * 100)}%`)

export const LAYER: Record<Layer, { label: string; text: string; bg: string; soft: string; border: string; hex: string }> = {
  abstinence: {
    label: 'Abstinence',
    text: 'text-abstinence-ink',
    bg: 'bg-abstinence',
    soft: 'bg-abstinence/15',
    border: 'border-abstinence/70',
    hex: '#6f86e6',
  },
  boundary: {
    label: 'Boundaries',
    text: 'text-boundary-ink',
    bg: 'bg-boundary',
    soft: 'bg-boundary/15',
    border: 'border-boundary/70',
    hex: '#b8862a',
  },
  selfcare: {
    label: 'Self Care',
    text: 'text-selfcare-ink',
    bg: 'bg-selfcare',
    soft: 'bg-selfcare/15',
    border: 'border-selfcare/70',
    hex: '#2f9f76',
  },
}

export const SETBACK_HEX = '#74777d'

type Variant = 'primary' | 'secondary' | 'ghost' | 'quiet'
const VARIANTS: Record<Variant, string> = {
  primary: 'bg-ink text-bg font-semibold',
  secondary: 'bg-surface-2 text-ink',
  ghost: 'border border-line text-ink',
  quiet: 'text-muted',
}

export function Button({
  variant = 'secondary',
  className = '',
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      type="button"
      className={`inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl px-5 transition-opacity active:opacity-60 disabled:opacity-35 ${VARIANTS[variant]} ${className}`}
      {...rest}
    >
      {children}
    </button>
  )
}

/** A toggle chip. `tone` colours the selected state with a layer accent. */
export function Chip({
  selected,
  onClick,
  children,
  tone,
  className = '',
}: {
  selected: boolean
  onClick: () => void
  children: ReactNode
  tone?: Layer | 'neutral'
  className?: string
}) {
  const on = tone && tone !== 'neutral' ? `${LAYER[tone].soft} ${LAYER[tone].border} text-ink` : 'bg-ink/10 border-ink/50 text-ink'
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={`min-h-11 rounded-full border px-4 text-[15px] transition-colors active:opacity-60 ${selected ? on : 'border-line text-ink/80'} ${className}`}
    >
      {children}
    </button>
  )
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <section className={`rounded-3xl bg-surface p-5 ${className}`}>{children}</section>
}

export function Label({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <h2 className={`text-[13px] font-medium uppercase tracking-[0.08em] text-muted ${className}`}>{children}</h2>
}

export function LayerTag({ layer }: { layer: Layer }) {
  return (
    <span className="inline-flex items-center gap-2 text-[13px] font-medium text-ink/90">
      <span className={`size-2.5 rounded-full ${LAYER[layer].bg}`} />
      {LAYER[layer].label}
    </span>
  )
}

/** Full-screen layer above the tabs, with its own header. */
export function Screen({
  title,
  onClose,
  back,
  children,
  footer,
  action,
}: {
  title?: string
  onClose: () => void
  back?: boolean
  children: ReactNode
  footer?: ReactNode
  action?: ReactNode
}) {
  return (
    <div className="fixed inset-0 z-30 flex flex-col bg-bg" role="dialog" aria-label={title}>
      <header className="pt-safe flex items-center gap-2 px-2">
        <button type="button" onClick={onClose} aria-label={back ? 'Back' : 'Close'} className="grid size-12 place-items-center text-muted active:opacity-60">
          {back ? <IconBack /> : <IconClose />}
        </button>
        <h1 className="flex-1 truncate text-[17px] font-semibold">{title}</h1>
        {action}
      </header>
      <div className="scroll-area flex-1 overflow-y-auto overscroll-contain px-4 pb-8">{children}</div>
      {footer && <footer className="pb-safe border-t border-line bg-bg px-4 pt-3">{footer}</footer>}
    </div>
  )
}

export function Segmented<T extends string>({
  value,
  options,
  onChange,
  className = '',
}: {
  value: T
  options: { value: T; label: string }[]
  onChange: (v: T) => void
  className?: string
}) {
  return (
    <div className={`flex rounded-2xl bg-surface p-1 ${className}`} role="tablist">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="tab"
          aria-selected={value === o.value}
          onClick={() => onChange(o.value)}
          className={`min-h-10 flex-1 rounded-xl px-2 text-[14px] transition-colors ${value === o.value ? 'bg-surface-2 font-semibold text-ink' : 'text-muted'}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

/** Big number with a caption; the app's basic unit of information. */
export function Stat({ value, label, className = '' }: { value: ReactNode; label: ReactNode; className?: string }) {
  return (
    <div className={className}>
      <div className="text-2xl font-semibold tabular-nums">{value}</div>
      <div className="mt-0.5 text-[13px] leading-snug text-muted">{label}</div>
    </div>
  )
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="py-8 text-center leading-relaxed text-muted">{children}</p>
}

export function formatDate(d: string, opts: Intl.DateTimeFormatOptions = { weekday: 'short', day: 'numeric', month: 'short' }) {
  const [y, m, day] = d.split('-').map(Number) as [number, number, number]
  return new Date(y, m - 1, day).toLocaleDateString(undefined, opts)
}

export function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
}

export const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`
