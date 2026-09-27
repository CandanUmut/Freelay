import { useEffect, useState } from 'react'
import { verifyBiometric } from '../lib/biometric'
import { verifyPin } from '../lib/pin'
import type { Settings } from '../db/types'

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'bio', '0', 'del'] as const

/** PIN pad. Also used (with `onSubmit`) to set a new PIN. */
export function PinPad({
  title,
  onSubmit,
  error,
  bioLabel,
  onBio,
}: {
  title: string
  onSubmit: (pin: string) => void | Promise<void>
  error?: string | null
  bioLabel?: string
  onBio?: () => void
}) {
  const [pin, setPin] = useState('')
  const press = (k: (typeof KEYS)[number]) => {
    if (k === 'del') return setPin((p) => p.slice(0, -1))
    if (k === 'bio') return onBio?.()
    setPin((p) => (p.length < 8 ? p + k : p))
  }

  return (
    <div className="mx-auto flex max-w-xs flex-col items-center">
      <p className="text-[17px]">{title}</p>
      <div className="mt-5 flex h-4 gap-3" aria-label={`${pin.length} digits entered`}>
        {Array.from({ length: Math.max(4, pin.length) }, (_, i) => (
          <span key={i} className={`size-3 rounded-full ${i < pin.length ? 'bg-ink' : 'border border-muted'}`} />
        ))}
      </div>
      <p className="mt-3 h-5 text-[14px] text-muted" role="alert">
        {error}
      </p>
      <div className="mt-4 grid grid-cols-3 gap-3">
        {KEYS.map((k) =>
          k === 'bio' ? (
            onBio ? (
              <button key={k} type="button" onClick={() => press(k)} className="grid size-18 place-items-center rounded-full text-[13px] text-muted">
                {bioLabel ?? 'Face ID'}
              </button>
            ) : (
              <span key={k} />
            )
          ) : (
            <button
              key={k}
              type="button"
              onClick={() => press(k)}
              aria-label={k === 'del' ? 'Delete' : k}
              className={`grid size-18 place-items-center rounded-full text-2xl ${k === 'del' ? 'text-[15px] text-muted' : 'bg-surface active:bg-surface-2'}`}
            >
              {k === 'del' ? 'Delete' : k}
            </button>
          ),
        )}
      </div>
      <button
        type="button"
        disabled={pin.length < 4}
        onClick={async () => {
          await onSubmit(pin)
          setPin('')
        }}
        className="mt-6 min-h-12 w-full rounded-2xl bg-ink font-semibold text-bg disabled:opacity-30"
      >
        OK
      </button>
    </div>
  )
}

export function LockScreen({ settings, onUnlock }: { settings: Settings; onUnlock: () => void }) {
  const [error, setError] = useState<string | null>(null)
  const [tries, setTries] = useState(0)

  async function bio() {
    if (settings.biometricCredId && (await verifyBiometric(settings.biometricCredId))) onUnlock()
  }

  useEffect(() => {
    // Offer biometrics straight away; iOS may require a tap first, which the button covers.
    if (settings.biometricCredId) void bio()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="pt-safe fixed inset-0 z-50 flex flex-col justify-center bg-bg px-6">
      <PinPad
        title="Enter PIN"
        error={error}
        onBio={settings.biometricCredId ? bio : undefined}
        onSubmit={async (pin) => {
          if (settings.pinHash && (await verifyPin(pin, settings.pinHash))) onUnlock()
          else {
            const n = tries + 1
            setTries(n)
            // A short delay after repeated misses; enough to slow guessing, not to punish.
            if (n >= 5) await new Promise((r) => setTimeout(r, 2000 * (n - 4)))
            setError('That PIN didn’t match.')
          }
        }}
      />
    </div>
  )
}
