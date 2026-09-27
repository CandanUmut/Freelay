# Ledger

A private recovery tracker for addictive and compulsive behaviours, built as an installable PWA. It runs on your phone only: no accounts, no server, no analytics, and no network requests. The data lives in IndexedDB on the device, and JSON export/import is the only backup.

You track three layers:

- **Abstinence**: the behaviours you're stopping.
- **Boundaries**: conditions that raise risk.
- **Self Care**: things that protect you.

The app's main output is how the layers relate in your own data. For example: *"On days you slept before midnight, your clean rate is 94% (38 days); when you didn't, 71% (19 days)."*

## Screens

| Tab | What it does |
|---|---|
| **Today** | Shows the 30-day clean rate as the headline, lifetime clean days, and the streak as a small chip. Below that:<br>• one forward target (beat your best, the next milestone, or the 66-day replacement habit)<br>• a risk-window warning when setbacks have clustered at this point before<br>• the check-in<br>• Log urge / Journal / Panic<br>• a lesson suggested by recent data |
| **Log** | Logs an urge in three taps: intensity, outcome, save. Trigger, place and a note are optional. After saving it shows your resisted-urge count, this urge's intensity against your average, and the if-then plan for that trigger. An urge marked "acted on it" records a setback for that day and shows the lapse protocol first. |
| **Progress** | • **Calendar** by layer, where tapping any day lets you view it or fill it in.<br>• **Insights**: ranked factors with strength labels, the 30-day rate trend per layer, and urge frequency, intensity and duration.<br>• **Urges**: a filtered list and an hour × weekday heatmap.<br>• **Timeline**: milestones, personal bests, and setbacks with what came before them. |
| **Plans** | If-then plans linked to triggers, the lapse protocol (shown automatically after any setback), and the replacement habit. |
| **Learn** | 21 short lessons with no order and nothing locked, grouped by topic. They cover the brain and dopamine, urges, habits, sleep and loneliness, setbacks and shame, compulsive sexual behaviour and OCD. Each lesson ends with the research behind it, and there is a **Further reading** library of 30 papers, books and talks. Every source was checked when added: DOIs against Crossref, free full texts through Europe PMC, and web pages by fetching them. |

**Panic** is a full-screen urge-surfing timer. When the urge passes, it records how long it lasted: *"That one lasted 9 minutes. Your average is 13. You have ridden out 24 urges."*

## Insights from day one, tested by simulation

Early on, the app shows only what is true by construction: facts and trends such as urges resisted, when urges cluster, how long timed urges lasted, week-over-week changes, the weekly review, and milestones. Claims about *what goes with what* come later and carry a label: early signal, likely pattern, or clear pattern.

These rules were tuned with a simulator. It plays eight synthetic users with known ground truth through the app's real logic for 180 days each, and measures what the app said and how often it was wrong. See [docs/simulation-findings.md](docs/simulation-findings.md) for what changed and why, and [docs/simulation-report.md](docs/simulation-report.md) for the numbers.

```sh
npm run sim                                    # rerun the simulation and rewrite the report
npx tsx scripts/diary.ts improver 1 30         # what Today shows one synthetic user, day by day
```

## Honesty rules in the code

- **The rate ignores unreported days, and coverage is shown next to it.** A 30-day rate counts only days you reported, so it could look better than it is if you skip bad days. The share of days reported is always displayed beside it.
- **Patterns must survive a strict test.** About 22 comparisons are re-run every day, so the bar is high:
  - setback comparisons need at least 8 days on each side, at least 5 setbacks, and |z| ≥ 3
  - urge comparisons use a dispersion-corrected test at |z| ≥ 3
  - every pattern must point the same way in both halves of the 60-day window
- **Weak results are not shown as findings.** They appear only in a collapsed list of raw comparisons.
- **The risk window is a hazard test.** It is flagged only when setbacks really are at least 2× more likely at that point.
- **Low coverage gets a warning.** When fewer than 70% of days are reported, Today says the rate is probably flattering.
- **The check-in is the only record of a setback.** Logging an urge as "acted on it" writes the setback into that day's check-in, so the urge log and the check-in can't disagree.
- **Archiving never rewrites history.** Items that have been used can only be archived, not deleted.

## Develop

```sh
npm install
npm run dev        # http://localhost:5173
npm test           # unit tests, including a printed report on the 60-day sample data
npm run build      # production build + service worker
npm run preview    # serve the build (the service worker works here, not in dev)
```

To see the app with history: **Settings → Data and backup → Load sample data**.

## Install on iPhone

1. Host the `dist/` folder over HTTPS. Any static host works (GitHub Pages, Netlify, Cloudflare Pages). A service worker needs HTTPS.
2. Open the URL in Safari, then tap **Share → Add to Home Screen**. It installs as "Ledger", with a plain icon.
3. Open it once while online. After that it works permanently in airplane mode.

## Limits on iOS

- **The PIN and Face ID only hide the screen; nothing is encrypted.** Face ID uses WebAuthn with no server to check the signature. It hasn't been tested on a real iPhone yet.
- **Hiding the app-switcher snapshot is best effort.** The screen is covered as soon as the page is hidden, but iOS gives no guarantee for web apps.
- **Export regularly.** Home-screen apps are exempt from Safari's 7-day storage cap, and the app requests persistent storage. Still, deleting the app deletes its data. Today shows a reminder when you haven't exported in 21 days.
- **There are no push notifications,** because they're unreliable in iOS PWAs. The check-in card on Today is the daily prompt.

## Layout

```
src/
  db/          Dexie schema, types, seed items, export/import, sample data
  metrics/     all derived numbers as pure functions (rate, streaks, factors, risk window, timeline, feedback)
  content/     lessons and the rules that suggest them
  app/         data context, navigation, write actions
  screens/     one file per screen; progress/ holds the four Progress tabs
  ui/          shared components and icons
  lib/         dates (with day-boundary offset), PIN hashing, WebAuthn
```

Entry values record whether the named thing *happened* that day, in every layer: for abstinence that means you did it, for a boundary that it was crossed, and for self care that it was done. `isHeld()` converts that into a good or bad outcome. All dates are local `YYYY-MM-DD` values, shifted by a configurable day boundary (default 04:00).
