import type { Layer, Target } from '../db/types'

/**
 * Suggestions shown during setup and in the item editor. Nothing is added
 * unless the person taps it. Ids are stable: lesson rules and the sample data
 * refer to some of them (e.g. bnd-sleep), so adding one from here keeps those
 * working, while items people type themselves get random ids.
 */
export interface Topic {
  id: string
  label: string
}

export const TOPICS: Topic[] = [
  { id: 'porn', label: 'Pornography' },
  { id: 'social', label: 'Scrolling & social media' },
  { id: 'gaming', label: 'Gaming' },
  { id: 'gambling', label: 'Gambling' },
  { id: 'alcohol', label: 'Alcohol' },
  { id: 'nicotine', label: 'Smoking or vaping' },
  { id: 'cannabis', label: 'Cannabis' },
  { id: 'food', label: 'Binge eating' },
  { id: 'shopping', label: 'Shopping' },
  { id: 'ocd', label: 'OCD compulsions' },
]

export interface Suggestion {
  id: string
  layer: Layer
  name: string
  target?: Target
  /** Topics it's most relevant to; empty means useful for anyone. */
  topics: string[]
}

export const SUGGESTIONS: Suggestion[] = [
  // Abstinence: what you're stepping away from
  { id: 'abs-sites', layer: 'abstinence', name: 'Explicit websites', topics: ['porn'] },
  { id: 'abs-social', layer: 'abstinence', name: 'Explicit social media content', topics: ['porn', 'social'] },
  { id: 'abs-other', layer: 'abstinence', name: 'Other (lusting, etc.)', topics: ['porn'] },
  { id: 'abs-shortvideo', layer: 'abstinence', name: 'Short-form video (Reels, TikTok, Shorts)', topics: ['social'] },
  { id: 'abs-scroll', layer: 'abstinence', name: 'Scrolling for more than 30 minutes', topics: ['social'] },
  { id: 'abs-gaming', layer: 'abstinence', name: 'Gaming past my limit', topics: ['gaming'] },
  { id: 'abs-bet', layer: 'abstinence', name: 'Betting or casino apps', topics: ['gambling'] },
  { id: 'abs-lottery', layer: 'abstinence', name: 'Scratch cards or lottery', topics: ['gambling'] },
  { id: 'abs-alcohol', layer: 'abstinence', name: 'Drinking alcohol', topics: ['alcohol'] },
  { id: 'abs-smoke', layer: 'abstinence', name: 'Smoking or vaping', topics: ['nicotine'] },
  { id: 'abs-cannabis', layer: 'abstinence', name: 'Cannabis', topics: ['cannabis'] },
  { id: 'abs-binge', layer: 'abstinence', name: 'Binge eating', topics: ['food'] },
  { id: 'abs-shop', layer: 'abstinence', name: 'Impulse buying', topics: ['shopping'] },
  { id: 'ocd-check', layer: 'abstinence', name: 'Checking (locks, stove, etc.)', topics: ['ocd'] },
  { id: 'ocd-reassure', layer: 'abstinence', name: 'Asking for reassurance', topics: ['ocd'] },
  { id: 'ocd-wash', layer: 'abstinence', name: 'Extra washing or cleaning', topics: ['ocd'] },
  { id: 'ocd-review', layer: 'abstinence', name: 'Mental reviewing', topics: ['ocd'] },

  // Boundaries: conditions that raise risk
  { id: 'bnd-sleep', layer: 'boundary', name: 'Not enough sleep', topics: [] },
  { id: 'bnd-lonely', layer: 'boundary', name: 'Loneliness', topics: [] },
  { id: 'bnd-alone', layer: 'boundary', name: 'Alone at home all day', topics: [] },
  { id: 'bnd-stress', layer: 'boundary', name: 'High-stress day', topics: [] },
  { id: 'bnd-bored', layer: 'boundary', name: 'Bored with nothing planned', topics: [] },
  { id: 'bnd-phone', layer: 'boundary', name: 'Phone in bed', topics: ['porn', 'social', 'gaming', 'gambling'] },
  { id: 'bnd-shorts', layer: 'boundary', name: 'Short-form social media', topics: ['porn', 'social'] },
  { id: 'bnd-late', layer: 'boundary', name: 'Up after midnight', topics: [] },
  { id: 'bnd-drinking-around', layer: 'boundary', name: 'Around people drinking', topics: ['alcohol', 'nicotine', 'cannabis'] },
  { id: 'bnd-payday', layer: 'boundary', name: 'Payday or money in the account', topics: ['gambling', 'shopping'] },
  { id: 'bnd-skipped-meal', layer: 'boundary', name: 'Skipped meals', topics: ['food'] },
  { id: 'bnd-caffeine', layer: 'boundary', name: 'More than 2 coffees', topics: ['ocd'] },

  // Self care: what protects you
  { id: 'sc-midnight', layer: 'selfcare', name: 'Sleep before midnight', topics: [] },
  { id: 'sc-steps', layer: 'selfcare', name: 'Steps (thousands)', target: { type: 'count', value: 5 }, topics: [] },
  { id: 'sc-exercise', layer: 'selfcare', name: 'Exercise 20+ minutes', topics: [] },
  { id: 'sc-outside', layer: 'selfcare', name: 'Time outside', topics: [] },
  { id: 'sc-family', layer: 'selfcare', name: 'Call family or a friend', topics: [] },
  { id: 'sc-prayer', layer: 'selfcare', name: 'Prayer or meditation', topics: [] },
  { id: 'sc-meals', layer: 'selfcare', name: 'Three proper meals', topics: [] },
  { id: 'sc-journal', layer: 'selfcare', name: 'Wrote in my journal', topics: [] },
  { id: 'sc-read', layer: 'selfcare', name: 'Read instead of scrolling', topics: ['porn', 'social', 'gaming'] },
  { id: 'sc-fast', layer: 'selfcare', name: 'Fasting', target: { type: 'perWeek', value: 2 }, topics: [] },
  { id: 'sc-clean', layer: 'selfcare', name: 'Tidied my space', topics: [] },
  { id: 'sc-exposure', layer: 'selfcare', name: 'Planned exposure practice', topics: ['ocd'] },
]

/** Suggestions for a layer: topic matches first, then general ones, then the rest. */
export function suggestionsFor(layer: Layer, topics: string[], exclude: Set<string>): Suggestion[] {
  const rank = (s: Suggestion) => (s.topics.some((t) => topics.includes(t)) ? 0 : s.topics.length === 0 ? 1 : 2)
  return SUGGESTIONS.filter((s) => s.layer === layer && !exclude.has(s.id)).sort((a, b) => rank(a) - rank(b))
}
