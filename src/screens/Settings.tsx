import { useEffect, useState } from 'react'
import { useData } from '../app/data'
import { useNav } from '../app/nav'
import { db } from '../db/db'
import { saveSettings } from '../db/seed'
import { biometricAvailable, registerBiometric } from '../lib/biometric'
import { hashPin, isValidPin, verifyPin } from '../lib/pin'
import { IconChevron } from '../ui/icons'
import { Label, Screen } from '../ui/kit'
import { PinPad } from './Lock'

export function SettingsScreen({ onClose }: { onClose: () => void }) {
  const { settings } = useData()
  const nav = useNav()
  const [pinFlow, setPinFlow] = useState<null | 'set' | 'confirm' | 'remove'>(null)
  const [firstPin, setFirstPin] = useState('')
  const [pinError, setPinError] = useState<string | null>(null)
  const [bioOk, setBioOk] = useState(false)
  const [bioMsg, setBioMsg] = useState<string | null>(null)

  useEffect(() => {
    void biometricAvailable().then(setBioOk)
  }, [])

  if (pinFlow)
    return (
      <Screen title={pinFlow === 'remove' ? 'Turn off PIN' : 'Set a PIN'} onClose={() => setPinFlow(null)} back>
        <div className="pt-10">
          <PinPad
            key={pinFlow}
            title={pinFlow === 'set' ? 'Choose a 4–8 digit PIN' : pinFlow === 'confirm' ? 'Enter it again' : 'Enter your current PIN'}
            error={pinError}
            onSubmit={async (pin) => {
              setPinError(null)
              if (pinFlow === 'set') {
                if (!isValidPin(pin)) return setPinError('Use 4 to 8 digits.')
                setFirstPin(pin)
                setPinFlow('confirm')
              } else if (pinFlow === 'confirm') {
                if (pin !== firstPin) {
                  setPinError('Those didn’t match. Start again.')
                  setPinFlow('set')
                  return
                }
                await saveSettings(db, { pinEnabled: true, pinHash: await hashPin(pin) })
                setPinFlow(null)
              } else {
                if (!settings.pinHash || !(await verifyPin(pin, settings.pinHash))) return setPinError('That PIN didn’t match.')
                await saveSettings(db, { pinEnabled: false, pinHash: undefined, biometricCredId: undefined })
                setPinFlow(null)
              }
            }}
          />
        </div>
      </Screen>
    )

  return (
    <Screen title="Settings" onClose={onClose}>
      <Row label="Tracked items" sub="Rename, add, archive, set targets" onClick={() => nav.push({ kind: 'items' })} />
      <Row label="Data and backup" sub="Export, import, sample data" onClick={() => nav.push({ kind: 'data' })} />

      <section className="mt-8">
        <Label>Day starts at</Label>
        <p className="mt-1 text-[14px] leading-snug text-muted">Anything logged before this hour counts as the previous day, so a 1am entry belongs to the night before.</p>
        <div className="mt-3 grid grid-cols-7 gap-1.5">
          {[0, 1, 2, 3, 4, 5, 6].map((h) => (
            <button
              key={h}
              type="button"
              aria-pressed={settings.dayBoundaryHour === h}
              onClick={() => saveSettings(db, { dayBoundaryHour: h })}
              className={`min-h-11 rounded-xl text-[15px] tabular-nums ${settings.dayBoundaryHour === h ? 'bg-ink font-semibold text-bg' : 'bg-surface'}`}
            >
              {h}:00
            </button>
          ))}
        </div>
      </section>

      <section className="mt-8">
        <Label>Privacy</Label>
        <div className="mt-3 divide-y divide-line rounded-2xl bg-surface">
          <ToggleRow
            label="PIN on launch"
            sub="Asked when the app opens, and after a minute away."
            on={settings.pinEnabled}
            onToggle={() => setPinFlow(settings.pinEnabled ? 'remove' : 'set')}
          />
          {settings.pinEnabled && bioOk && (
            <ToggleRow
              label="Face ID / Touch ID"
              sub={bioMsg ?? 'Unlock with biometrics; the PIN still works.'}
              on={Boolean(settings.biometricCredId)}
              onToggle={async () => {
                if (settings.biometricCredId) return saveSettings(db, { biometricCredId: undefined })
                try {
                  await saveSettings(db, { biometricCredId: await registerBiometric() })
                  setBioMsg(null)
                } catch {
                  setBioMsg('Could not set it up on this device.')
                }
              }}
            />
          )}
        </div>
        <p className="mt-3 text-[13px] leading-relaxed text-muted">
          The lock hides the screen; it does not encrypt your data. The screen is also covered whenever you leave the app, which usually keeps it out of the
          app switcher, though iOS doesn't guarantee that for web apps.
        </p>
      </section>

      <section className="mt-8 pb-6">
        <Label>About</Label>
        <p className="mt-2 text-[14px] leading-relaxed text-muted">
          Everything stays on this device. The app makes no network requests, has no accounts and no analytics. Your only backup is the export in Data and
          backup.
        </p>
        <p className="mt-2 text-[13px] text-muted">Version {__APP_VERSION__}</p>
      </section>
    </Screen>
  )
}

function Row({ label, sub, onClick }: { label: string; sub: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="mt-2 flex min-h-16 w-full items-center justify-between rounded-2xl bg-surface px-4 text-left first:mt-3">
      <span>
        <span className="block">{label}</span>
        <span className="text-[13px] text-muted">{sub}</span>
      </span>
      <IconChevron />
    </button>
  )
}

function ToggleRow({ label, sub, on, onToggle }: { label: string; sub: string; on: boolean; onToggle: () => void }) {
  return (
    <button type="button" role="switch" aria-checked={on} onClick={onToggle} className="flex min-h-16 w-full items-center justify-between gap-3 px-4 py-3 text-left">
      <span>
        <span className="block">{label}</span>
        <span className="text-[13px] leading-snug text-muted">{sub}</span>
      </span>
      <span className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${on ? 'bg-selfcare' : 'bg-surface-2'}`}>
        <span className={`absolute top-0.5 size-6 rounded-full bg-ink transition-all ${on ? 'left-[22px]' : 'left-0.5'}`} />
      </span>
    </button>
  )
}
