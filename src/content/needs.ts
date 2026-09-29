import type { ReflectionKey } from '../db/types'

/**
 * An urge usually promises something (relief, escape, closeness). Underneath
 * there's often a real need that the habit meets badly. Naming both, then
 * taking one small step toward the need, is the core of the "Look underneath"
 * flow. Ways are starting suggestions; people edit their own in Plans.
 */
export interface Option {
  id: string
  label: string
}

export const PROMISES: Option[] = [
  { id: 'relief', label: 'Relief' },
  { id: 'escape', label: 'Escape' },
  { id: 'switch-off', label: 'To switch off' },
  { id: 'excitement', label: 'Excitement' },
  { id: 'comfort', label: 'Comfort' },
  { id: 'reward', label: 'A reward' },
  { id: 'wanted', label: 'To feel wanted' },
  { id: 'numb', label: 'Not to feel something' },
]

export interface Need extends Option {
  /** Starting ideas for meeting the need in a way that actually meets it. */
  ways: string[]
}

export const NEEDS: Need[] = [
  { id: 'rest', label: 'Rest', ways: ['Lie down for 15 minutes without the phone', 'Go to bed early tonight', 'Close my eyes and breathe for 5 minutes'] },
  {
    id: 'connection',
    label: 'Connection',
    ways: ['Text or call one person', 'Go where there are people (café, library, gym)', 'Plan to see someone this week'],
  },
  { id: 'calm', label: 'Calm', ways: ['Slow breathing for 3 minutes', 'A hot shower', "Write down what's on my mind"] },
  { id: 'comfort', label: 'Comfort', ways: ['Something warm to drink', 'A blanket and a book', 'Say something kind to myself'] },
  { id: 'movement', label: 'To move', ways: ['Walk around the block', '10 minutes of stretching', 'Put on music and move'] },
  { id: 'fun', label: 'Fun', ways: ['A hobby with my hands', 'Watch something I chose, not a feed', 'A game with someone'] },
  { id: 'meaning', label: 'Meaning', ways: ['20 minutes on something that matters to me', 'Prayer or reflection', 'Help someone with something'] },
  { id: 'worth', label: 'To feel capable', ways: ['Finish one small task', "Look at what I've done this week", 'Learn something for 15 minutes'] },
  { id: 'closeness', label: 'Closeness', ways: ['Time with someone I trust', 'A long call with someone close', 'Plan something together'] },
  { id: 'food', label: 'Food or water', ways: ['Eat a real meal', 'A glass of water'] },
]

export const needById = (id: string) => NEEDS.find((n) => n.id === id)
export const promiseById = (id: string) => PROMISES.find((p) => p.id === id)

export interface ReflectionQuestion {
  key: ReflectionKey
  label: string
  question: string
  low: string
  high: string
  /** For stress, lower is better. */
  higherIsBetter: boolean
}

/**
 * Asked every few days, not daily. Each is a single 1-5 rating, in the spirit
 * of the self-efficacy and readiness rulers used in relapse-prevention and
 * motivational-interviewing research; they are not validated scales.
 */
export const REFLECTION: ReflectionQuestion[] = [
  {
    key: 'confidence',
    label: 'Confidence',
    question: 'How confident are you that you can handle urges over the next few days?',
    low: 'Not at all',
    high: 'Very',
    higherIsBetter: true,
  },
  {
    key: 'compassion',
    label: 'Self-forgiveness',
    question: 'When you slip or struggle, how kindly are you treating yourself?',
    low: 'Very harshly',
    high: 'With real kindness',
    higherIsBetter: true,
  },
  {
    key: 'motivation',
    label: 'Motivation',
    question: 'How much do you want this change right now?',
    low: 'Barely',
    high: 'Very much',
    higherIsBetter: true,
  },
  {
    key: 'connection',
    label: 'Connection',
    question: 'How connected do you feel to the people around you?',
    low: 'Alone',
    high: 'Very connected',
    higherIsBetter: true,
  },
  {
    key: 'stress',
    label: 'Stress',
    question: 'How stressed are you these days?',
    low: 'Calm',
    high: 'Very stressed',
    higherIsBetter: false,
  },
]
