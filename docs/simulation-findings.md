# What simulating users taught us

The app was tested by playing eight synthetic users through its real logic, one day at a time, for up to 180 days each (5 random seeds per user). Each synthetic user has known ground truth: what actually drives their setbacks and urges. That makes it possible to check whether what the app says is *true*, not just whether it runs. Numbers below come from `npm run sim`; the full table is in [simulation-report.md](simulation-report.md). The day-by-day view of a single user is available with `npx tsx scripts/diary.ts <persona> <seed> <days>`.

| Persona | What's true about them |
|---|---|
| Steady improver | Rough first month, then better. Short nights raise risk the next day; phone in bed the same day. |
| No real pattern | Setbacks and urges are random. Any confident claim is false. |
| Rare setbacks | About one a month. The phone drives urges strongly. |
| Patchy reporter | The improver's pattern, but checks in on 60% of days and only 30% of setback days. |
| OCD checking | ~5 urges to check a day. Stress drives them; exposure practice reduces them. |
| Weekend pattern | Days alone at home carry the risk. |
| Relapse cycle | Risk rises sharply 10–14 days after each setback. |
| Early dropout risk | Motivated for a week, then a setback, then fading engagement. |

## 1. The original design was silent for months, then mostly wrong

The first version only compared boundaries and self care against setbacks, and showed the top three even when weak.

- First insight arrived on **day 23 to 114**, depending on the user. The Today screen had no data card at all.
- When comparisons did appear, **47% to 100% of claim-days were false** (the "No real pattern" user got claims about fasting, loneliness and sleep, all noise).

Setbacks are simply too rare an outcome to learn from quickly, and showing weak differences as "hints" mostly showed noise.

**Changes:**
- **Facts and trends from day one.** Descriptive, always true: urges resisted, the hours urges cluster in, top trigger, how long timed urges lasted, week-over-week changes, most consistent self care, heaviest weekday, milestones. Every user now has something on day 1–4, and the Today card is never empty.
- **Urges as the main outcome for patterns.** Users log several urges for every setback, so item-vs-urge comparisons have 5–10× more data.
- **A weekly review** on the weekday the user started.
- **A pattern finder** that shows how much data exists and roughly how much is needed, instead of an empty screen.

## 2. Re-testing every day finds patterns in noise

With ~11 items × 2 lags checked every day for months, a threshold of |z| ≥ 2 guarantees chance "findings". The "No real pattern" user was shown a *strong* claim about fasting.

**Changes:**
- Setback comparisons now need |z| ≥ 3 (moderate) or 3.5 (strong), a Bonferroni-style bar for ~22 comparisons.
- Urge comparisons use a dispersion-corrected (quasi-Poisson) test, because urges cluster on bad days, and need |z| ≥ 3.0 even for the lowest tier ("early signal").
- **Split-half replication:** every pattern must point the same way in the older and newer halves of the window, independently.

Effect across all users and seeds: false claim-days went from **6,060 of 9,110** claim-days to **105 of 1,134**. The "No real pattern" user now sees a false claim on 0–11% of days depending on the seed (4% on average), mostly labelled "early signal; it can still change".

**The honest cost:** the first *true* pattern now appears around day 60–100 for most users (day 60 for the OCD user, whose urges are frequent). A looser threshold (2.8) found the improver's pattern about 30 days sooner but doubled false claims. We chose accuracy. The first weeks are served by facts, which are true by construction, not by early guesses.

## 3. The risk window fired constantly and predicted nothing

The first version flagged the range of days-since-last-setback where past setbacks clustered. For users with frequent setbacks, gaps always cluster at 1–5 days, so the flag was on for **102–149 of 180 days**, and on flagged days setbacks were *no more likely* than on other days (lift ≈ 1).

(An earlier measurement also looked worse than it was: the flag was computed after that day's check-in, so a flagged day could never contain a setback. It is now evaluated the way Today computes it, in the morning.)

**Change:** a hazard-rate test. For each range of days, setbacks per day-at-risk are compared with the overall rate; a range is flagged only if it is at least 2× riskier, holds at least 3 setbacks, and passes a one-sided Poisson test at z ≥ 2.5. Result: the flag now appears on 0–5 days for most users, and for the relapse-cycle user, whose risk really does peak at days 10–14, **flagged days carry 3.7× the setback rate**.

## 4. Small things only visible by "living" in the app

Reading the day-by-day diaries surfaced issues no unit test would:

- Day 1 said "your longest run, tomorrow sets a new best". A one-day best isn't worth mentioning; short runs now count toward the next milestone.
- On the evening of a setback, the target said "it starts with today". It now says "starting tomorrow".
- The Today card cycled between the same three facts. It now prefers facts not shown recently, so 17–29 different cards appear over six months.
- A new lesson appeared every day, and dismissing one immediately surfaced another. Suggestions now pause for a day after one is read or dismissed.
- For the OCD user the clean-day rate stays low for months while 90%+ of urges are resisted. Today now shows resisted urges under the headline.
- For the patchy reporter the 30-day rate read **11 points higher than reality**, because setback days go unrecorded. Today now says so when fewer than 70% of days are reported.

## Limits of this method

These personas are simple generative models written by the same person who wrote the analysis. They test whether the statistics behave; they can't show whether a real person finds a message motivating. Real use will still be the final test.
