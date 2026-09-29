/**
 * Short text lessons. No locking, no order. Paragraphs are separated by a
 * blank line; lines starting with "- " are list items, "## " a subheading.
 * Written plain and without moralising: shame is a relapse trigger.
 */
export interface Lesson {
  id: string
  title: string
  /** One line shown in lists and on the contextual card. */
  summary: string
  body: string
  /** Ids from sources.ts, shown as "Go deeper". */
  sources?: string[]
}

export const LESSONS: Lesson[] = [
  {
    id: 'habits',
    title: 'How habits form',
    summary: 'Cue, routine, reward, and why it takes longer than 21 days.',
    body: `A habit is a shortcut your brain builds so it doesn't have to decide. Something in the situation (a time, a place, a feeling, a device in your hand) becomes a cue. The cue starts a routine. The routine produces a reward, and the reward teaches the brain to run the same routine next time the cue appears.

After enough repetitions the decision disappears. The routine starts before you have consciously chosen anything. That is what makes a habit useful when it's brushing your teeth, and what makes it hard when it's something you want to stop.

## How long it takes

The figure people quote, 21 days, has no real research behind it. The best-known study (Lally and colleagues, 2010) followed people building a new daily behaviour and measured when it stopped needing effort. The median was about 66 days. The range was 18 to 254. Simple behaviours were faster; complex ones slower. Missing a single day did not measurably set anyone back.

That last finding matters. Automaticity builds from the total number of repetitions, not from an unbroken chain. A missed day costs you roughly one day, not everything before it.

## What this means for you

- The old habit is automatic. Expect it to fire before you've thought about it, especially when you're tired, alone or stressed. That is not a character flaw; it's the thing habits are designed to do.
- A new habit becomes automatic by repetition in the same context. Same cue, same response, many times.
- The 66-day target in this app is the median, not a promise. If it takes you longer, you're inside the normal range.

The data this app collects is mostly about cues: which conditions (sleep, being alone, the phone) reliably come before the routine. Once you know the cues, you know where to intervene.`,
    sources: ['lally2010', 'wood2016', 'neal2006'],
  },
  {
    id: 'replacement',
    title: 'What replacement means',
    summary: "You can't delete a routine. You can attach a different one to the same cue.",
    body: `There's no delete key for a habit. The connection between cue and routine stays in memory even after years without using it, which is why an old habit can come back quickly under the right conditions. What you can do is build a competing routine that answers the same cue.

## The cue stays, the answer changes

Suppose the cue is lying in bed at 23:00 with the phone, feeling restless. The old routine answers that. A replacement has to answer the same moment: it has to be available right there, fast to start, and give some version of what the old routine gave (relief, stimulation, a break from a feeling).

"Be stronger" is not a replacement. "Put the phone on the kitchen charger and read ten pages" is.

## A good replacement is

- Tied to a specific cue, not a general intention.
- Physically easy in that moment. If it requires getting dressed and driving, it won't happen at 23:00.
- Rewarding in its own right, even a little. A walk, a shower, a call, music, stretching, a page of something you like.
- Repeated in the same context until it's automatic.

## Why name one habit

This app lets you name one replacement habit and counts the days since you started it, with 66 as the target. One is deliberate. Trying to install five new habits at once splits the repetitions you need for any of them to stick.

Pick the one that answers your most common cue. Your Urges tab shows which trigger and which hours come up most; start there.`,
    sources: ['wood2016', 'lally2010'],
  },
  {
    id: 'urge-surfing',
    title: 'Urge surfing',
    summary: 'An urge is a wave. It rises, peaks and falls whether or not you act on it.',
    body: `Urge surfing is a technique from relapse-prevention work (Alan Marlatt and colleagues). The idea is simple and a little counterintuitive: instead of fighting an urge or giving in to it, you watch it.

## The shape of an urge

An urge feels like it will keep building until you do something. It doesn't. Urges behave like waves: they rise, peak and subside, usually within minutes to half an hour. Acting on an urge ends it quickly, which teaches the brain that acting is the only way out. Riding one out teaches the opposite, and each time you do it the next wave tends to be a little smaller.

## How to do it

- Notice it and name it: "this is an urge." Naming it puts a small distance between you and it.
- Find where it is in your body. Chest, stomach, hands, jaw. Describe it to yourself: tight, warm, buzzing, restless.
- Breathe slowly and watch the sensation change. It will. Rate it 1 to 10 every minute or so.
- Don't argue with the thoughts that come with it ("just once", "it doesn't matter"). Notice them as part of the wave.
- Wait for it to crest. You don't need it to disappear, only to fall enough that you can choose.

## Your own evidence

The Panic button in this app is an urge-surfing timer. When the wave passes, tap "It passed" and it records how long it took. Over time you'll have your own average, and a count of urges you've ridden out.

That count is the point. Being told urges pass is weak. Having a list of 30 that you personally watched pass is strong.`,
    sources: ['bowen2009', 'bowen2014', 'brewerTed'],
  },
  {
    id: 'urge-anatomy',
    title: 'What an urge is made of',
    summary: 'Body, thoughts, and a very persuasive story about "just once".',
    body: `An urge feels like one thing, but it's easier to handle if you can see its parts.

## The body

Arousal, restlessness, a tight chest, heat, fidgeting. These are real physiological changes and they're uncomfortable. They are also temporary and not dangerous.

## The thoughts

Urges come with a script, and the script is usually good at its job:

- "Just once won't matter."
- "I've already had a bad day, so what's the difference."
- "I'll start properly tomorrow."
- "I deserve this."
- "I'll just look, not do anything."

These thoughts show up reliably, which means you can recognise them. When one appears, it helps to label it for what it is: "that's the urge talking." You don't have to win the argument. You only have to notice it's an argument.

## The pull toward the device

Much of the urge is directed at a specific action: picking up the phone, opening a browser, a particular app. The moment of reaching for the device is often the last easy exit. Any friction you put there (the phone in another room, blocking at the DNS level, grayscale mode) buys you the few minutes the wave needs to crest.

## Intensity is information

When you log an urge in this app you rate its intensity. Over weeks, you may notice that average intensity drops even while urges still happen. That's progress a streak can't show: the same number of waves, but smaller ones.`,
    sources: ['brewerTed', 'brewer2011', 'berridge2016'],
  },
  {
    id: 'if-then',
    title: 'If-then plans',
    summary: 'Decide in advance, in one sentence, what you will do when the cue appears.',
    body: `An if-then plan (researchers call it an implementation intention) links a specific situation to a specific response: "If it's 23:00 and I'm still on my phone, then I put it on the kitchen charger."

It sounds too simple to matter. It isn't. A meta-analysis by Gollwitzer and Sheeran (2006), pooling 94 studies, found a medium-to-large effect on reaching goals compared with just intending to. The mechanism is that you make the decision once, on a calm day, instead of in the moment when you're least able to.

## Writing a good one

- The "if" must be something you can notice: a time, a place, a feeling, an action. "If I feel lonely after work" works. "If I'm tempted" is too vague.
- The "then" must be one concrete action you can start in under a minute. "Text one person" works. "Do something healthy" doesn't.
- One plan per cue. Two or three well-chosen plans beat a dozen.

## Where they come from in this app

The Plans tab holds your if-then plans, each tied to one or more triggers from your Boundaries list. When you log an urge and pick a trigger, the matching plan appears on the same screen, at the moment it's needed.

When you use a plan, tap "Used it." The count tells you which plans actually get used, and which ones are just good ideas.

## When a plan fails

That's information, not a verdict. Usually the "if" was too late (the urge was already strong) or the "then" was too hard to start. Move the "if" earlier in the chain, or make the "then" smaller.`,
    sources: ['gollwitzer2006'],
  },
  {
    id: 'ave',
    title: 'The abstinence violation effect',
    summary: 'Why one slip turns into three weeks off track, and how to interrupt it.',
    body: `The abstinence violation effect (AVE) was described by Marlatt and Gordon in the 1980s. It explains a pattern many people know from the inside: one slip, then another, then weeks off track.

## How it works

After a lapse, two things tend to happen:

- You attribute it to something fixed about yourself: "I'm weak", "I'll never change", "this is who I am."
- You feel the gap between your goal and what you did, and the feeling is intense: shame, guilt, hopelessness.

Put together, the conclusion is: "I've already failed, so it doesn't matter anymore." That conclusion, not the first lapse, is what turns a slip into a relapse.

## What interrupts it

- Attribute the lapse to specific, changeable conditions. "I slept four hours, was alone all evening and had the phone in bed" is both more accurate and more useful than "I'm weak."
- Treat it as one data point. This app shows your 30-day rate precisely so that one day moves the number a few percent rather than wiping it to zero.
- Act on the next 24 hours, not the last 24. Your lapse protocol exists for exactly this.

## Why this app doesn't reset to zero

A counter that drops from 30 to 0 after one setback does the AVE's work for it: it tells you everything is gone. It isn't. The 30 days happened, your brain did the repetitions, and your total clean days haven't gone anywhere. The streak exists in this app, but it's never the headline.`,
    sources: ['witkiewitz2004', 'hendershot2011'],
  },
  {
    id: 'day-after',
    title: 'The day after a setback',
    summary: 'A lapse is an event. What happens in the next 48 hours decides whether it stays one.',
    body: `A lapse is a single event. A relapse is a return to the old pattern. The difference is mostly decided in the day or two afterwards, and that's where your effort goes furthest.

## What tends to happen

The day after, it's common to feel flat, ashamed, irritable or numb. Sleep may be off. The pull to avoid the whole subject (skip the check-in, don't open the app) is strong. Avoidance feels like relief but leaves the conditions that led to the lapse unchanged.

## What helps

- Record it plainly. One honest line, facts only. You're writing data, not a confession.
- Look at what came before. The Timeline in this app shows setbacks with what preceded them: boundaries crossed that day and the day before, the time and trigger of the urge.
- Choose one boundary to defend today. Not five. The one that shows up most often before your setbacks.
- Do one self-care item early. Sleep, a walk, food, a call. The goal is to change your physical state, which changes what feels possible.
- Talk to someone, if you have someone. Secrecy tends to feed the cycle.

## What doesn't help

Punishing yourself, making sweeping promises, or deciding to be perfect from now on. All three raise the stakes of the next slip and make hiding more likely.

## Your lapse protocol

On a good day, write in the Plans tab what you want to do the day after a setback. This app shows it to you automatically, before anything else, whenever a setback is logged. The version of you who wrote it was thinking clearly; let them help.`,
    sources: ['hendershot2011', 'witkiewitz2004'],
  },
  {
    id: 'environment',
    title: 'Environment and friction',
    summary: 'Change the room, not your willpower. A few seconds of friction goes a long way.',
    body: `Willpower is real but unreliable. It's lowest exactly when you need it: late at night, tired, alone, after a hard day. Environment is reliable. It works the same at 23:00 as at 09:00.

## Friction

Small obstacles have outsized effects on behaviour. Adding even a few seconds of effort between the cue and the routine gives the urge time to crest and gives you time to notice what's happening. Removing friction from the replacement makes it more likely to happen.

## Where to add friction

- The device. Content blocking at the DNS level, which you already have, is a strong layer. Others: remove specific apps, log out of accounts, turn on grayscale.
- The bedroom. A charger outside the bedroom is one of the most effective single changes, because it removes the device from your highest-risk context.
- Time. Some people schedule the phone to go into a restricted mode at a set hour.

## Where to remove friction

- Keep the replacement ready: a book by the bed, shoes by the door, a playlist queued.
- Make calling someone easy: favourites at the top, a message already half-typed to a friend.

## Context shifts

Habits are tied to contexts. Holidays, new rooms, travel and schedule changes can weaken old cues (useful) or remove your usual supports (risky). Notice when your context changes and check whether your plans still fit.

The Boundaries layer in this app is a list of environmental conditions. The Insights tab shows which of them, in your own data, are followed by setbacks most often. Start with the top one.`,
    sources: ['wood2016', 'neal2006'],
  },
  {
    id: 'phone-in-bed',
    title: 'The phone in bed',
    summary: "Late, tired, alone, with an endless feed in your hand. It's the riskiest setup there is.",
    body: `For many people the single highest-risk situation is simple: in bed, late, with the phone. It stacks several risk factors at once.

- You're tired, and self-control drops with fatigue.
- You're alone and unobserved.
- The device gives instant access to anything.
- Feeds are designed to keep you scrolling, and short-form content in particular trains quick switching and novelty-seeking.
- Late use delays sleep, which raises risk again the next day.

## What people find works

- Charge the phone outside the bedroom. Use a cheap alarm clock if the phone is your alarm.
- If that's too much at first, a fixed time after which the phone goes to the charger, the same every night.
- Replace the last 20 minutes: a paper book, a podcast on a speaker, stretching, journaling.
- Short-form feeds are often the gateway rather than the destination. If they come before your urges, they're a boundary worth defending on their own.

## Check it against your own data

"Phone in bed" is one of your boundaries. After a few weeks the Insights tab will show your abstinence rate on days with and without it, same day and the next day. If the difference is large, you've found where to start. If it's small, your data is pointing somewhere else, and that's worth knowing too.`,
    sources: ['irish2015', 'walker2009'],
  },
  {
    id: 'sleep',
    title: 'Sleep as an upstream input',
    summary: 'A short night raises risk, often the next day more than the same day.',
    body: `Sleep is one of the most reliable upstream inputs to self-control, and one of the most overlooked.

## What sleep loss does

Research on sleep deprivation consistently finds weaker regulation by the prefrontal cortex (the planning, "is this a good idea" part of the brain), stronger emotional reactivity, and a pull toward immediate reward. Put simply: after a short night, urges feel stronger and the brakes are weaker. Mood is lower, which adds another reason to look for relief.

## Why the next day matters

This is why the Insights tab checks both same-day and next-day effects. A late night often doesn't show up as a setback that night; it shows up the following evening, when you're running on four or five hours and the day has used up what reserves you had.

## What helps

- A consistent sleep time matters more than an occasional long lie-in.
- Before-midnight sleep is a self-care item in this app for a reason. So is "not enough sleep" as a boundary.
- Wind down away from screens. Bright, stimulating content late at night delays sleep and is itself a risk context.
- If you've had a bad night, treat the next day as a higher-risk day: protect the evening, make a plan for the hours you're most tired.

## Read your own numbers

After a few weeks of check-ins, look at "Not enough sleep" and "Sleep before midnight" in Insights. If the next-day difference is large, sleep may be the single most useful boundary to defend.`,
    sources: ['yoo2007', 'walker2009', 'irish2015'],
  },
  {
    id: 'halt',
    title: 'Hungry, angry, lonely, tired',
    summary: 'Four states that make urges louder. Check them before you check your willpower.',
    body: `HALT is an old recovery-group acronym: hungry, angry, lonely, tired. It's not science in itself, but each of the four states is independently known to reduce self-control or increase the pull toward quick relief. Together they're a useful checklist.

## When an urge shows up, check

- Hungry: when did you last eat? Low blood sugar makes irritability and impulsivity worse.
- Angry: is there frustration or resentment you haven't dealt with? Urges often show up as a way to not feel something.
- Lonely: have you had a real conversation today?
- Tired: how did you sleep, and how long have you been going?

If the answer to any of these is yes, the most useful thing may be to fix that directly: eat, move, call someone, go to bed. The urge is often a signal about the state underneath it.

## Mood as data

The check-in in this app includes an optional mood rating. Over time, mood trends alongside your other data can show whether low days predict setbacks, and whether setbacks predict low days afterwards. Both are common.

## Boredom, stress and relief

Many urges are, underneath, a wish for relief from something: stress, boredom, sadness, a sense of emptiness at the end of a day. Naming what you want relief from ("I'm bored and restless", "that meeting wound me up") makes it easier to find another way to get it.`,
    sources: ['walker2009', 'hawkley2010'],
  },
  {
    id: 'loneliness',
    title: 'Loneliness as a driver',
    summary: "Isolation isn't just a mood. It changes how the brain looks for comfort.",
    body: `Loneliness is one of the most common upstream conditions before compulsive behaviour, and one of the least talked about.

## Why it matters

Research on loneliness (much of it by John Cacioppo) shows it's not just a feeling. It changes attention and motivation: lonely people become more alert to threat, sleep worse, and are more drawn to quick sources of comfort. Compulsive behaviours often promise a counterfeit version of connection or comfort, which is exactly what loneliness makes you look for.

Being alone and being lonely are different. Some people are fine alone for a day; others feel it within hours. Your data can tell you which applies to you: "Alone at home all day" and "Loneliness" are separate boundaries for this reason.

## What helps

- Small contact counts. A message, a call, a few minutes of conversation. It doesn't have to be deep to lower the pull.
- Scheduled contact beats hoping for it. "Call family" is a self-care item; put it at a fixed time on your riskiest days.
- Get out of the house on long solo days: a café, a library, a walk where there are people. Being around others without talking still helps.
- Longer term, the things that build real connection (a group, a class, a sport, a community, a friend you see regularly) are protective in a way no app can be.

## Check your data

If loneliness shows up often before urges or setbacks, it's worth making it the first boundary you plan for. Write an if-then plan for it: "If I notice I feel lonely, then I text one person or leave the house for 15 minutes."`,
    sources: ['cacioppo2009', 'hawkley2010'],
  },
  {
    id: 'relapse-data',
    title: 'What relapse looks like over years',
    summary: 'Recovery is rarely a straight line. The trend matters more than any single day.',
    body: `If you plot the recovery of almost anyone who has changed a deep habit, it doesn't look like a flat line from "before" to "after." It looks like a noisy line that trends in the right direction, with dips along the way.

## What the research consistently shows

- Lapses are common, including among people who go on to change the behaviour for good. A study following 1,277 smokers estimated, with its most careful method, that quitting for good took about 30 attempts on average. Older estimates of around 6 had left out the people who found it hardest.
- Early periods are the most volatile. Risk tends to decrease the longer the new pattern is held, but it doesn't go to zero.
- What predicts long-term outcome is less whether someone lapses and more what they do afterwards: whether a lapse becomes a relapse.

## What to look at instead of the streak

- The rolling 30-day rate. Is it higher than three months ago?
- Time between setbacks. Are the gaps getting longer?
- Urge intensity and duration. Are the waves getting smaller and shorter?
- Recovery time. After a setback, how many days until you're back on track?

All four can improve while setbacks still happen. The Insights tab tracks the first and third; the Timeline shows the second and fourth.

## Risk windows

Some people find their setbacks cluster at a particular distance from the previous one: day 10 to 16, say. The Today screen flags this if your data shows it. A known risk window is useful because you can plan for it, rather than being surprised by it.`,
    sources: ['chaiton2016', 'witkiewitz2004', 'bouton2004'],
  },
  {
    id: 'rates',
    title: 'Why a rate, not a streak',
    summary: 'A number that drops to zero after one bad day measures the wrong thing.',
    body: `Most tracking apps put a streak at the centre: days since the last setback. It's simple and motivating, for a while. Then one setback resets it to zero, and a month of real work disappears from the screen.

## What the streak gets wrong

- It treats day 29 and day 0 as opposites when they're separated by one event.
- It punishes the most at the most dangerous moment, right after a lapse, when feeling that everything is lost is exactly what drives the next one.
- It gives you only something to lose, never anything to gain.

## What this app shows instead

- The 30-day rate: clean days out of reported days in the last 30. Twenty-nine good days out of thirty reads 97%, which is what it is.
- Reporting coverage next to it, so the rate can't quietly flatter you by leaving out days. If coverage is low, the rate is less reliable, and you'll see that.
- Total clean days, lifetime. This only goes up. A setback doesn't remove any of them.
- A forward target: a personal best to beat, the next milestone, the replacement habit's day count. Always something ahead.

The current streak is still there, as a small chip. It's real information. It just isn't the headline.

## Backfilling is fine

Missed a check-in? Tap the day in the calendar and fill it in. The app marks it as backfilled for your own reference and otherwise treats it the same. An honest record with gaps filled in is worth more than a perfect-looking one.`,
    sources: ['witkiewitz2004', 'chaiton2016'],
  },
  {
    id: 'shame',
    title: 'Shame is not a brake',
    summary: 'Feeling terrible after a setback feels like accountability. It mostly predicts the next one.',
    body: `It's natural to feel bad after a setback, and it can feel like the right response: if I feel bad enough, I won't do it again. The research points the other way.

## Guilt and shame are different

Psychologists distinguish guilt ("I did a bad thing") from shame ("I am bad"). Guilt focuses on a behaviour and tends to motivate repair. Shame focuses on the whole self and tends to motivate hiding, withdrawal and avoidance.

In one study of people in recovery from alcohol use (Randles and Tracy, 2013), those who showed more shame when talking about their last drink were more likely to relapse in the following months. Shame, in other words, is a risk factor, not a safeguard. It's also isolating, and isolation is itself a trigger.

## What works better

- Describe the behaviour, not yourself. "I spent an hour on explicit sites last night after a four-hour sleep" rather than "I'm disgusting."
- Take responsibility for the next step, not for being a better person in general.
- Talk to yourself roughly the way you'd talk to a friend in the same situation. That isn't letting yourself off; it's what actually makes change more likely. Research on self-compassion finds it tends to increase motivation to improve, not reduce it.
- Tell someone, if you have someone safe to tell. Shame thrives on secrecy.

## In this app

Nothing here is red. Setbacks show in a neutral grey. There are no broken chains or lost badges. That's deliberate: the app's job is to give you accurate information, not to punish you.`,
    sources: ['randles2013', 'tangney2007', 'breines2012', 'neff'],
  },
  {
    id: 'reading-data',
    title: 'How to read your own insights',
    summary: 'Your correlations are real observations, not proof. Here is how to use them well.',
    body: `The Insights tab compares your abstinence rate on days when each boundary or self-care item was held versus not. For example: "On days you slept before midnight, your clean rate was 94% (38 days); when you didn't, 71% (19 days)."

## What these numbers are

They are observed differences in your own data. They're specific to you, which makes them more relevant than any general study. They are not proof that one thing causes another.

## Why not proof

- Things travel together. Days you sleep late may also be days you're alone and on your phone. The app can't fully separate these.
- Small samples are noisy. With only a handful of setbacks, a difference of 15 points can come from one or two days.
- Many comparisons. The app checks about 20 item-and-lag combinations. By chance alone, one or two will look interesting.

## How the app protects you from noise

- It needs at least 8 days on each side and at least 5 setbacks in the window before it shows a comparison.
- Each result has a strength label (strong, moderate, weak) based on how far the difference is from what chance would produce.
- It ranks strong results above weak ones, regardless of size.

## How to use them

Treat a strong result as a good bet, not a law. Pick the top factor, defend it for a few weeks, and watch whether your rate moves. That's a small experiment on yourself, and it's the most reliable way to learn what actually works for you.

If everything is weak, that's also useful: it may mean your setbacks are too few to analyse (good), or that the cause is something you're not yet tracking. Consider adding a boundary.`,
  },
  {
    id: 'compulsions',
    title: 'Compulsions work the same way',
    summary: 'For OCD-type loops, the urge to check or neutralise follows the same wave.',
    body: `This app was designed around addictive behaviours, but the structure fits compulsive loops too: checking, reassurance-seeking, washing, mental reviewing, re-reading.

## The loop

An intrusive thought or doubt brings anxiety. A compulsion (checking the lock, asking again, reviewing a memory) brings relief. The relief teaches the brain that the compulsion was necessary, so the next doubt comes back stronger and the compulsion becomes more urgent. It's the same cue, routine and reward structure as any habit, with anxiety relief as the reward.

## Exposure and response prevention

The best-supported treatment for OCD, exposure and response prevention (ERP), works a lot like urge surfing. You let the anxiety rise without doing the compulsion, and stay with it until it falls on its own. It does fall. Each time, the brain learns that the compulsion wasn't needed.

ERP is usually done with a trained therapist, and for significant OCD that's strongly recommended. This app is not a treatment. But it can support the work:

- Add compulsions as items in the Abstinence layer ("checking the stove", "asking for reassurance").
- Log urges to do them, with intensity, and mark them resisted when you let the anxiety pass without acting.
- Use the Panic timer to ride out the anxiety and record how long it took to fall.
- Add upstream conditions (sleep, stress, being alone) as boundaries, and see which ones come before your hardest days.

## One difference

With OCD, trying to argue with the intrusive thought or get certainty about it is itself a compulsion. The aim isn't to prove the doubt wrong. It's to let it be there and not act on it.`,
    sources: ['hezel2019', 'nimhOcd'],
  },
  {
    id: 'dopamine',
    title: 'What dopamine actually does',
    summary: "Not the pleasure chemical. It's the brain's prediction signal, and that explains a lot about urges.",
    body: `Dopamine is usually described as the brain's pleasure chemical. The research tells a more useful story.

## A prediction signal

In the 1990s, Wolfram Schultz and colleagues recorded dopamine neurons in monkeys. When a reward arrived unexpectedly, the neurons fired. After the animal learned that a light predicted the reward, the neurons fired at the light instead, and barely at all when the expected reward arrived. When a predicted reward failed to show up, activity dipped below baseline.

So dopamine tracks the difference between what you expected and what you got. It's a teaching signal: it tells the brain what to pay attention to and what to go after next time.

## Why that matters for urges

Through repetition, the cues that come before a habit (the phone in your hand, the hour, the empty flat) become predictors. They start the anticipation before anything has happened. An urge is, in large part, that prediction firing: the brain signalling that something rewarding is available right now.

This is also why the pull is strongest around cues and weakest when they're absent, and why changing your environment works.

## Tolerance and adaptation

Brains adapt to strong, frequent reward. Research on drug addiction has found lasting changes in dopamine signalling and in the prefrontal systems that support self-control. The evidence for behaviours like pornography or gaming is less direct and still debated, so be careful with confident online claims about "fried receptors".

## About "dopamine detox"

You can't, and wouldn't want to, drain your brain of dopamine. What the idea gets right is simpler: less exposure to cues and to fast, intense rewards gives cue-triggered wanting a chance to weaken, and lets ordinary rewards compete again. That takes weeks of repetition, not a weekend.

## What this means in practice

- Expect urges near cues. They're predictions, not commands.
- Each time a cue comes and goes without the old routine, the prediction is slightly less certain.
- Old predictions don't vanish; they get outcompeted. See "Why urges come back".`,
    sources: ['schultz1997', 'volkow2016', 'volkow2017', 'nida', 'lembke', 'huberman'],
  },
  {
    id: 'wanting-liking',
    title: 'Wanting is not liking',
    summary: 'The brain systems for craving something and enjoying it are separate. Craving can grow while enjoyment fades.',
    body: `Many people in recovery say something like: "I don't even enjoy it much anymore, but I still want it badly." That isn't a contradiction. It's one of the best-supported findings in addiction neuroscience.

## Two different systems

Kent Berridge and Terry Robinson spent decades separating two things we normally treat as one:

- Wanting: the pull, the motivation to go and get something. Strongly driven by dopamine and triggered by cues.
- Liking: the actual pleasure when you get it. Driven by smaller, separate brain systems.

In everyday life they move together. With repeated exposure to a strong reward, they can come apart. Cue-triggered wanting can become stronger and more automatic (they call it incentive sensitization) while the liking stays the same or even declines.

## Why this is useful to know

- An urge is not evidence that you'll enjoy it. It's evidence that a cue fired.
- The intensity of wanting says little about how much the thing will actually give you.
- You can test this against your own experience. Judson Brewer's approach asks people to pay close attention to what the behaviour actually delivers, in detail. Many find the reality is flatter than the craving promised, and that noticing this weakens the pull over time.

## A small exercise

Next time you log an urge, add a note afterwards: on a scale of 1 to 10, how much did you want it, and (if you acted on it) how much did you actually enjoy it? Over a few weeks the gap between the two numbers is often striking, and it's your own evidence.`,
    sources: ['berridge2016', 'brewerTed', 'brewer2011'],
  },
  {
    id: 'extinction',
    title: 'Why urges come back',
    summary: "New learning covers old learning; it doesn't erase it. A return of old urges after a good stretch is normal.",
    body: `After a good run, it can be alarming when strong urges return out of nowhere. It helps to know this is one of the most predictable things in the psychology of learning.

## Extinction is new learning

When a cue no longer leads to the old reward, the pull weakens. Psychologists call this extinction. Research by Mark Bouton and others shows extinction doesn't delete the old association. It adds a new one on top ("this cue no longer means that"), and the new learning is more fragile and more tied to context than the old.

## So the old habit can return when

- Time passes. An urge can reappear after weeks of quiet (spontaneous recovery).
- The context changes. A holiday, a new flat or a new routine can bring the old pattern back, because the new learning was tied to the old context (renewal).
- Stress hits, or you have one lapse, and the old pattern reactivates more strongly than you expected (reinstatement).

## What to do with that

- Don't read a returning urge as proof that nothing has changed. The new learning is still there; it's being tested.
- Practise the new response in more than one context: at home, when travelling, when tired, when stressed. That makes the new learning more robust.
- Expect risk around changes. Planning for a holiday or a stressful week in advance is realistic, not pessimistic.
- Your data helps here. If Progress shows urges rising after a change in routine, that's exactly this effect.`,
    sources: ['bouton2004', 'witkiewitz2004', 'hendershot2011'],
  },
  {
    id: 'csbd',
    title: 'Is it an addiction? What the research says',
    summary: "Where science stands on compulsive sexual behaviour, and why your values matter to how it feels.",
    body: `People who struggle with pornography or other sexual behaviours often wonder whether "addiction" is the right word. The research is more settled than it used to be, and also more nuanced.

## What the WHO recognises

Since ICD-11, the World Health Organization's diagnostic manual includes compulsive sexual behaviour disorder. It's classified as an impulse control disorder rather than an addiction. The core of it is a persistent pattern, over six months or more, of failing to control intense, repetitive sexual urges, so that the behaviour continues despite harm and despite repeated efforts to cut down, and causes marked distress or problems in life.

The authors note one important boundary: distress that comes entirely from moral judgements or disapproval of the behaviour isn't, on its own, enough for the diagnosis.

## The role of values

Joshua Grubbs and colleagues reviewed many studies and found that feeling addicted to pornography is strongly linked to moral or religious disapproval of it, not only to how much someone actually watches.

That does not mean the struggle is imaginary. It means two things are often going on at once:

- the behaviour itself, with its habits, cues and urges, and
- the conflict between the behaviour and what you believe in.

Both are real. The second one tends to produce shame, and shame, as another lesson here covers, feeds the cycle rather than stopping it.

## What this means for you

- You get to decide what you want your life to look like. You don't need a diagnosis to want to change a habit.
- The tools in this app (urge surfing, if-then plans, changing your environment, tracking the upstream conditions) work whatever label fits.
- Living by your values and being gentle with yourself when you fall short aren't in conflict. The research suggests the second makes the first more likely.
- If the distress is heavy, a therapist experienced with compulsive sexual behaviour can help, ideally one who takes your values seriously rather than dismissing them.`,
    sources: ['kraus2018', 'grubbs2019', 'tangney2007'],
  },
  {
    id: 'needs',
    title: 'What the urge promises, and what you need',
    summary: "An urge is often a bad answer to a real need. Find the need, and there are better answers.",
    body: `When an urge arrives it comes with a promise: relief, escape, excitement, comfort, a moment of feeling wanted. The promise is usually about something real. After a lonely evening, the need for connection is real. After a draining week, the need for rest is real. The habit is just one way of meeting it, and usually a poor one: brief, and followed by feeling worse.

## Two questions

When you log an urge, the app asks two optional questions:

- What was it promising? The immediate pay-off the urge was offering.
- What do you actually need right now? The thing underneath.

They often differ. An urge that promises excitement can sit on top of boredom, or on top of a week with nothing that felt meaningful. One that promises comfort can sit on top of being exhausted.

## Why the need matters

Psychologists have long argued that people have basic needs (self-determination theory names three: feeling capable, having choice, and being connected to others) and that when these go unmet, people drift toward whatever gives a quick substitute. Clinicians working with addiction have made a related observation: many people use a substance or behaviour to manage painful feelings. That idea comes mostly from clinical experience rather than trials, but it matches what many people notice about themselves.

The practical point: if you only fight the urge, the need is still there tomorrow. If you meet the need another way, the urge has less to offer.

## Small steps count

You don't need to fix loneliness in one evening. Text one person. Go somewhere with people around. Lie down for fifteen minutes without the phone. The Plans tab keeps your own list of ways to meet each need, and logs each one as a step.

Over a few weeks, the Insights tab shows which needs come up most. That's often the most useful thing the app can tell you: not what you're trying to stop, but what you're actually missing.`,
    sources: ['ryan2000', 'khantzian1997', 'brewerTed', 'berridge2016'],
  },
  {
    id: 'confidence',
    title: 'Confidence, motivation and forgiveness',
    summary: 'How you see yourself shapes what happens next. These three are worth watching, and they can change.',
    body: `Every few days the app asks a few short questions: how confident you feel, how kindly you're treating yourself, how much you want this change, how connected you feel, how stressed you are. Here's why those matter as much as the urges.

## Confidence

Researchers call it self-efficacy: your belief that you can handle a difficult situation without falling back on the habit. Across many studies of addiction treatment, it's one of the more consistent predictors of how things go. It isn't a fixed trait. It grows from evidence, and the best evidence is your own: each urge you ride out, each hard evening you get through. That's why the app counts them.

Low confidence isn't a verdict. It's a signal to lean on plans and structure rather than willpower, especially in the situations that feel shakiest.

## Motivation

Motivation goes up and down, sometimes daily. Wanting to change and not wanting to change at the same time is normal; counsellors call it ambivalence. Motivational interviewing, an approach built on working with that ambivalence rather than fighting it, has decades of research behind it (with modest but real effects).

Two practical points follow. Don't wait to feel motivated before acting: set things up on high-motivation days so low days are easier. And when motivation dips, remind yourself why you started, in your own words. A journal entry written on a good day is useful here.

## Self-forgiveness

After a slip, being hard on yourself can feel like taking it seriously. The research points the other way: shame tends to predict more relapse, while self-compassion tends to increase motivation to improve (see "Shame is not a brake"). Recovery communities have said the same for a long time.

Forgiving yourself isn't pretending it didn't matter. It's refusing to add a second injury to the first, so you have the energy for the next day.

## Using the numbers

On Progress → Insights, each of these shows as a small line over time. Watch the direction rather than any single answer. Rising confidence with falling urges is progress, even while setbacks still happen.`,
    sources: ['kadden2011', 'lundahl2010', 'webb2017', 'breines2012', 'randles2013'],
  },
]

export const lessonById = (id: string) => LESSONS.find((l) => l.id === id)

export function readingMinutes(l: Lesson): number {
  return Math.max(2, Math.round(l.body.split(/\s+/).length / 200))
}
