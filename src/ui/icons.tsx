// A handful of stroke icons, drawn inline so nothing is fetched and no icon
// library ships in the bundle.
type P = { className?: string }
const base = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.7,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  viewBox: '0 0 24 24',
  'aria-hidden': true,
}

export const IconToday = ({ className = 'size-6' }: P) => (
  <svg {...base} className={className}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 7.5V12l3 2" />
  </svg>
)
export const IconLog = ({ className = 'size-6' }: P) => (
  <svg {...base} className={className}>
    <path d="M3 12h3.5l2.5-6 4 12 2.5-6H21" />
  </svg>
)
export const IconProgress = ({ className = 'size-6' }: P) => (
  <svg {...base} className={className}>
    <path d="M5 20V11M12 20V5M19 20v-6" />
  </svg>
)
export const IconPlans = ({ className = 'size-6' }: P) => (
  <svg {...base} className={className}>
    <path d="M5 6h3M5 12h3M5 18h3M11 6h8M11 12h8M11 18h8" />
  </svg>
)
export const IconLearn = ({ className = 'size-6' }: P) => (
  <svg {...base} className={className}>
    <path d="M4 5.5C6.5 4.5 9.5 4.5 12 6c2.5-1.5 5.5-1.5 8-.5v13c-2.5-1-5.5-1-8 .5-2.5-1.5-5.5-1.5-8-.5z" />
    <path d="M12 6v13" />
  </svg>
)
export const IconClose = ({ className = 'size-6' }: P) => (
  <svg {...base} className={className}>
    <path d="M6 6l12 12M18 6L6 18" />
  </svg>
)
export const IconBack = ({ className = 'size-6' }: P) => (
  <svg {...base} className={className}>
    <path d="M15 5l-7 7 7 7" />
  </svg>
)
export const IconChevron = ({ className = 'size-5' }: P) => (
  <svg {...base} className={className}>
    <path d="M9 5l7 7-7 7" />
  </svg>
)
export const IconSettings = ({ className = 'size-6' }: P) => (
  <svg {...base} className={className}>
    <path d="M4 7h10M18 7h2M4 17h4M12 17h8" />
    <circle cx="16" cy="7" r="2" />
    <circle cx="10" cy="17" r="2" />
  </svg>
)
export const IconPen = ({ className = 'size-6' }: P) => (
  <svg {...base} className={className}>
    <path d="M4 20h4L19 9l-4-4L4 16z" />
    <path d="M13 7l4 4" />
  </svg>
)
export const IconWave = ({ className = 'size-6' }: P) => (
  <svg {...base} className={className}>
    <path d="M2 14c2.5 0 2.5-5 5-5s2.5 5 5 5 2.5-5 5-5 2.5 5 5 5" />
  </svg>
)
export const IconPlus = ({ className = 'size-6' }: P) => (
  <svg {...base} className={className}>
    <path d="M12 5v14M5 12h14" />
  </svg>
)
export const IconUp = ({ className = 'size-5' }: P) => (
  <svg {...base} className={className}>
    <path d="M6 15l6-6 6 6" />
  </svg>
)
export const IconDown = ({ className = 'size-5' }: P) => (
  <svg {...base} className={className}>
    <path d="M6 9l6 6 6-6" />
  </svg>
)
