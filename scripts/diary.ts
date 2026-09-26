/**
 * Prints what Today would show a persona each day, for reading the app as a
 * user would. `npx tsx scripts/diary.ts improver 1 21`
 */
import { PERSONAS } from '../src/sim/personas'
import { simulate } from '../src/sim/run'

const [id = 'improver', seedArg = '1', daysArg = '21'] = process.argv.slice(2)
const p = PERSONAS.find((x) => x.id === id)
if (!p) throw new Error(`unknown persona ${id}`)
const { days, views } = simulate(p, 'current', Number(seedArg))
for (const v of views.slice(0, Number(daysArg))) {
  const d = days[v.day - 1]!
  const logged = d.urges.length
  const facts = [
    `day ${String(v.day).padStart(3)} ${v.date}`,
    d.entry ? (d.setback ? 'SETBACK' : 'clean  ') : 'no check-in',
    `urges logged ${logged}`,
  ].join(' | ')
  console.log(facts)
  console.log(`    next:   ${v.target}`)
  if (v.card) console.log(`    card:   [${v.card.confidence}] ${v.card.text}`)
  if (v.lesson) console.log(`    lesson: ${v.lesson}`)
  if (v.review) console.log(`    review: weekly review shown`)
  if (v.risk) console.log(`    RISK WINDOW`)
}
