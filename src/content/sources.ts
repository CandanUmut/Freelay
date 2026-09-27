/**
 * Further reading. Every entry was checked when it was added:
 *  - papers: DOI resolved through Crossref, and title, authors and year
 *    matched against its metadata
 *  - free full text: PMC id confirmed through the Europe PMC API
 *  - web pages: fetched and title checked
 * Links open in the browser; the app itself still makes no requests.
 */
export type SourceKind = 'paper' | 'review' | 'book' | 'talk' | 'podcast' | 'guide'

export interface Source {
  id: string
  kind: SourceKind
  title: string
  authors: string
  /** Omitted for web pages whose date can't be pinned down. */
  year?: number
  venue?: string
  /** Canonical link (DOI or page). */
  url: string
  /** Free full text, when the canonical link may be paywalled. */
  freeUrl?: string
  /** One line: why it's worth reading. */
  note: string
}

const doi = (d: string) => `https://doi.org/${d}`
const pmc = (id: string) => `https://pmc.ncbi.nlm.nih.gov/articles/${id}/`

export const SOURCES: Source[] = [
  // Habits
  {
    id: 'lally2010',
    kind: 'paper',
    title: 'How are habits formed: Modelling habit formation in the real world',
    authors: 'Lally, van Jaarsveld, Potts, Wardle',
    year: 2010,
    venue: 'European Journal of Social Psychology',
    url: doi('10.1002/ejsp.674'),
    note: 'Where the 66-day median comes from, and why missing one day barely matters.',
  },
  {
    id: 'wood2016',
    kind: 'review',
    title: 'Psychology of Habit',
    authors: 'Wood, Rünger',
    year: 2016,
    venue: 'Annual Review of Psychology',
    url: doi('10.1146/annurev-psych-122414-033417'),
    note: 'How context cues trigger habits, and why changing the context works better than willpower.',
  },
  {
    id: 'neal2006',
    kind: 'review',
    title: 'Habits: A Repeat Performance',
    authors: 'Neal, Wood, Quinn',
    year: 2006,
    venue: 'Current Directions in Psychological Science',
    url: doi('10.1111/j.1467-8721.2006.00435.x'),
    note: 'A short, readable overview of how much of daily behaviour runs on habit.',
  },
  {
    id: 'gollwitzer2006',
    kind: 'review',
    title: 'Implementation Intentions and Goal Achievement: A Meta-analysis of Effects and Processes',
    authors: 'Gollwitzer, Sheeran',
    year: 2006,
    venue: 'Advances in Experimental Social Psychology',
    url: doi('10.1016/S0065-2601(06)38002-1'),
    note: 'The evidence behind if-then plans, pooled across 94 studies.',
  },

  // Urges and relapse prevention
  {
    id: 'bowen2009',
    kind: 'paper',
    title: 'Surfing the urge: Brief mindfulness-based intervention for college student smokers',
    authors: 'Bowen, Marlatt',
    year: 2009,
    venue: 'Psychology of Addictive Behaviors',
    url: doi('10.1037/a0017127'),
    note: 'The study that put the name "urge surfing" into the research literature.',
  },
  {
    id: 'bowen2014',
    kind: 'paper',
    title: 'Relative Efficacy of Mindfulness-Based Relapse Prevention, Standard Relapse Prevention, and Treatment as Usual for Substance Use Disorders',
    authors: 'Bowen, Witkiewitz, Clifasefi, et al.',
    year: 2014,
    venue: 'JAMA Psychiatry',
    url: doi('10.1001/jamapsychiatry.2013.4546'),
    freeUrl: pmc('PMC4489711'),
    note: 'A randomised trial comparing mindfulness-based and standard relapse prevention over a year.',
  },
  {
    id: 'brewer2011',
    kind: 'paper',
    title: 'Mindfulness training for smoking cessation: Results from a randomized controlled trial',
    authors: 'Brewer, Mallik, Babuscio, et al.',
    year: 2011,
    venue: 'Drug and Alcohol Dependence',
    url: doi('10.1016/j.drugalcdep.2011.05.027'),
    freeUrl: pmc('PMC3191261'),
    note: 'Curiosity about cravings, instead of fighting them, as a way to weaken them.',
  },
  {
    id: 'brewerTed',
    kind: 'talk',
    title: 'A simple way to break a bad habit',
    authors: 'Judson Brewer',
    venue: 'TED',
    url: 'https://www.ted.com/talks/judson_brewer_a_simple_way_to_break_a_bad_habit',
    note: 'Ten minutes on noticing what an urge actually delivers. The best short introduction here.',
  },
  {
    id: 'hendershot2011',
    kind: 'review',
    title: 'Relapse prevention for addictive behaviors',
    authors: 'Hendershot, Witkiewitz, George, Marlatt',
    year: 2011,
    venue: 'Substance Abuse Treatment, Prevention, and Policy',
    url: doi('10.1186/1747-597x-6-17'),
    freeUrl: pmc('PMC3163190'),
    note: 'Open-access overview of the relapse-prevention model this app is built around.',
  },
  {
    id: 'witkiewitz2004',
    kind: 'review',
    title: 'Relapse Prevention for Alcohol and Drug Problems: That Was Zen, This Is Tao',
    authors: 'Witkiewitz, Marlatt',
    year: 2004,
    venue: 'American Psychologist',
    url: doi('10.1037/0003-066x.59.4.224'),
    note: 'Why relapse is better understood as a dynamic process than as a single failure.',
  },
  {
    id: 'chaiton2016',
    kind: 'paper',
    title: 'Estimating the number of quit attempts it takes to quit smoking successfully in a longitudinal cohort of smokers',
    authors: 'Chaiton, Diemert, Cohen, et al.',
    year: 2016,
    venue: 'BMJ Open',
    url: doi('10.1136/bmjopen-2016-011045'),
    freeUrl: pmc('PMC4908897'),
    note: 'Successful quitting usually follows many attempts. Earlier attempts aren’t wasted.',
  },
  {
    id: 'bouton2004',
    kind: 'review',
    title: 'Context and Behavioral Processes in Extinction',
    authors: 'Bouton',
    year: 2004,
    venue: 'Learning & Memory',
    url: doi('10.1101/lm.78804'),
    note: 'Why an old habit can return after a break, in a new place or under stress: new learning covers old learning rather than erasing it.',
  },

  // Brain and dopamine
  {
    id: 'schultz1997',
    kind: 'paper',
    title: 'A Neural Substrate of Prediction and Reward',
    authors: 'Schultz, Dayan, Montague',
    year: 1997,
    venue: 'Science',
    url: doi('10.1126/science.275.5306.1593'),
    note: 'The classic paper showing dopamine neurons signal prediction errors, not pleasure.',
  },
  {
    id: 'berridge2016',
    kind: 'review',
    title: 'Liking, wanting, and the incentive-sensitization theory of addiction',
    authors: 'Berridge, Robinson',
    year: 2016,
    venue: 'American Psychologist',
    url: doi('10.1037/amp0000059'),
    freeUrl: pmc('PMC5171207'),
    note: 'Why wanting something can grow even as enjoying it doesn’t.',
  },
  {
    id: 'volkow2016',
    kind: 'review',
    title: 'Neurobiologic Advances from the Brain Disease Model of Addiction',
    authors: 'Volkow, Koob, McLellan',
    year: 2016,
    venue: 'New England Journal of Medicine',
    url: doi('10.1056/NEJMra1511480'),
    freeUrl: pmc('PMC6135257'),
    note: 'The standard neuroscience account of addiction: reward, stress and self-control circuits.',
  },
  {
    id: 'volkow2017',
    kind: 'review',
    title: 'The dopamine motive system: implications for drug and food addiction',
    authors: 'Volkow, Wise, Baler',
    year: 2017,
    venue: 'Nature Reviews Neuroscience',
    url: doi('10.1038/nrn.2017.130'),
    note: 'How dopamine drives motivation, and how that system changes with repeated strong rewards.',
  },
  {
    id: 'nida',
    kind: 'guide',
    title: 'Drugs, Brains, and Behavior: The Science of Addiction',
    authors: 'National Institute on Drug Abuse',
    venue: 'NIDA (free online)',
    url: 'https://nida.nih.gov/publications/drugs-brains-behavior-science-addiction/drugs-brain',
    note: 'A plain-language guide to what happens in the brain. Drug-focused, but the circuitry is the same.',
  },
  {
    id: 'lembke',
    kind: 'book',
    title: 'Dopamine Nation: Finding Balance in the Age of Indulgence',
    authors: 'Anna Lembke',
    year: 2021,
    venue: 'Dutton (book); link is the author’s Stanford profile',
    url: 'https://profiles.stanford.edu/anna-lembke',
    note: 'A psychiatrist’s readable account, with patient stories. The pleasure–pain "balance" is a helpful metaphor, not a measured mechanism.',
  },
  {
    id: 'huberman',
    kind: 'podcast',
    title: 'Controlling Your Dopamine for Motivation, Focus & Satisfaction',
    authors: 'Huberman Lab',
    year: 2021,
    venue: 'Podcast episode',
    url: 'https://www.hubermanlab.com/episode/controlling-your-dopamine-for-motivation-focus-and-satisfaction',
    note: 'A popular, long-form overview. Useful for intuition; some practical claims go beyond what studies have shown.',
  },

  // Sleep, loneliness, emotion
  {
    id: 'yoo2007',
    kind: 'paper',
    title: 'The human emotional brain without sleep: a prefrontal amygdala disconnect',
    authors: 'Yoo, Gujar, Hu, Jolesz, Walker',
    year: 2007,
    venue: 'Current Biology',
    url: doi('10.1016/j.cub.2007.08.007'),
    note: 'After a night without sleep, the amygdala reacted much more strongly to negative images, with weaker prefrontal control.',
  },
  {
    id: 'walker2009',
    kind: 'review',
    title: 'Overnight therapy? The role of sleep in emotional brain processing',
    authors: 'Walker, van der Helm',
    year: 2009,
    venue: 'Psychological Bulletin',
    url: doi('10.1037/a0016570'),
    freeUrl: pmc('PMC2890316'),
    note: 'Why a short night makes the next day’s emotions harder to regulate.',
  },
  {
    id: 'irish2015',
    kind: 'review',
    title: 'The role of sleep hygiene in promoting public health: A review of empirical evidence',
    authors: 'Irish, Kline, Gunn, Buysse, Hall',
    year: 2015,
    venue: 'Sleep Medicine Reviews',
    url: doi('10.1016/j.smrv.2014.10.001'),
    freeUrl: pmc('PMC4400203'),
    note: 'What the evidence actually supports among common sleep advice.',
  },
  {
    id: 'cacioppo2009',
    kind: 'review',
    title: 'Perceived social isolation and cognition',
    authors: 'Cacioppo, Hawkley',
    year: 2009,
    venue: 'Trends in Cognitive Sciences',
    url: doi('10.1016/j.tics.2009.06.005'),
    freeUrl: pmc('PMC2752489'),
    note: 'How loneliness changes attention, self-regulation and sleep.',
  },
  {
    id: 'hawkley2010',
    kind: 'review',
    title: 'Loneliness Matters: A Theoretical and Empirical Review of Consequences and Mechanisms',
    authors: 'Hawkley, Cacioppo',
    year: 2010,
    venue: 'Annals of Behavioral Medicine',
    url: doi('10.1007/s12160-010-9210-8'),
    freeUrl: pmc('PMC3874845'),
    note: 'The broader review: loneliness as a signal, and what it does to behaviour.',
  },

  // Shame and self-compassion
  {
    id: 'randles2013',
    kind: 'paper',
    title: 'Nonverbal Displays of Shame Predict Relapse and Declining Health in Recovering Alcoholics',
    authors: 'Randles, Tracy',
    year: 2013,
    venue: 'Clinical Psychological Science',
    url: doi('10.1177/2167702612470645'),
    note: 'Shame after a slip predicted more relapse, not less.',
  },
  {
    id: 'tangney2007',
    kind: 'review',
    title: 'Moral Emotions and Moral Behavior',
    authors: 'Tangney, Stuewig, Mashek',
    year: 2007,
    venue: 'Annual Review of Psychology',
    url: doi('10.1146/annurev.psych.56.091103.070145'),
    freeUrl: pmc('PMC3083636'),
    note: 'The difference between guilt ("I did a bad thing") and shame ("I am bad"), and why it matters.',
  },
  {
    id: 'breines2012',
    kind: 'paper',
    title: 'Self-Compassion Increases Self-Improvement Motivation',
    authors: 'Breines, Chen',
    year: 2012,
    venue: 'Personality and Social Psychology Bulletin',
    url: doi('10.1177/0146167212445599'),
    note: 'Being kind to yourself after a failure made people try harder to improve, not less.',
  },
  {
    id: 'neff',
    kind: 'guide',
    title: 'Self-Compassion: exercises and research',
    authors: 'Kristin Neff',
    venue: 'self-compassion.org',
    url: 'https://self-compassion.org/',
    note: 'Short, practical exercises from the researcher who defined the concept.',
  },

  // Compulsive sexual behaviour and OCD
  {
    id: 'kraus2018',
    kind: 'review',
    title: 'Compulsive sexual behaviour disorder in the ICD-11',
    authors: 'Kraus, Krueger, Briken, et al.',
    year: 2018,
    venue: 'World Psychiatry',
    url: doi('10.1002/wps.20499'),
    freeUrl: pmc('PMC5775124'),
    note: 'The WHO’s definition, written by the people who drafted it. Two pages.',
  },
  {
    id: 'grubbs2019',
    kind: 'review',
    title: 'Pornography Problems Due to Moral Incongruence: An Integrative Model with a Systematic Review and Meta-Analysis',
    authors: 'Grubbs, Perry, Wilt, Reid',
    year: 2019,
    venue: 'Archives of Sexual Behavior',
    url: doi('10.1007/s10508-018-1248-x'),
    note: 'How conflict between behaviour and values shapes the experience of feeling addicted.',
  },
  {
    id: 'hezel2019',
    kind: 'review',
    title: 'Exposure and response prevention for obsessive-compulsive disorder: A review and new directions',
    authors: 'Hezel, Simpson',
    year: 2019,
    venue: 'Indian Journal of Psychiatry',
    url: doi('10.4103/psychiatry.indianjpsychiatry_516_18'),
    freeUrl: pmc('PMC6343408'),
    note: 'Open-access review of ERP, the best-supported treatment for OCD.',
  },
  {
    id: 'nimhOcd',
    kind: 'guide',
    title: 'Obsessive-Compulsive Disorder',
    authors: 'National Institute of Mental Health',
    venue: 'NIMH (free online)',
    url: 'https://www.nimh.nih.gov/health/topics/obsessive-compulsive-disorder-ocd',
    note: 'Plain-language overview of OCD, its treatment, and how to find help.',
  },
]

export const sourceById = (id: string) => SOURCES.find((s) => s.id === id)

export const LIBRARY: { title: string; ids: string[] }[] = [
  { title: 'Start here', ids: ['brewerTed', 'nida', 'hendershot2011', 'berridge2016'] },
  { title: 'The brain and dopamine', ids: ['schultz1997', 'berridge2016', 'volkow2016', 'volkow2017', 'lembke', 'huberman'] },
  { title: 'Habits and plans', ids: ['lally2010', 'wood2016', 'neal2006', 'gollwitzer2006'] },
  { title: 'Urges and relapse', ids: ['bowen2009', 'bowen2014', 'brewer2011', 'witkiewitz2004', 'chaiton2016', 'bouton2004'] },
  { title: 'Sleep and loneliness', ids: ['yoo2007', 'walker2009', 'irish2015', 'cacioppo2009', 'hawkley2010'] },
  { title: 'Shame and self-compassion', ids: ['randles2013', 'tangney2007', 'breines2012', 'neff'] },
  { title: 'Compulsive sexual behaviour and OCD', ids: ['kraus2018', 'grubbs2019', 'hezel2019', 'nimhOcd'] },
]
