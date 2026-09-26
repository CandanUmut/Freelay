import { useState } from 'react'
import { Segmented } from '../ui/kit'
import { Calendar } from './progress/Calendar'
import { Insights } from './progress/Insights'
import { Timeline } from './progress/Timeline'
import { Urges } from './progress/Urges'

type Sub = 'calendar' | 'insights' | 'urges' | 'timeline'

export default function Progress() {
  const [sub, setSub] = useState<Sub>(() => {
    try {
      return (sessionStorage.getItem('progress-tab') as Sub) || 'calendar'
    } catch {
      return 'calendar'
    }
  })
  const choose = (s: Sub) => {
    setSub(s)
    try {
      sessionStorage.setItem('progress-tab', s)
    } catch {
      /* storage unavailable; the tab just won't be remembered */
    }
  }

  return (
    <div className="px-4 pb-6">
      <h1 className="pt-3 text-[28px] font-semibold tracking-tight">Progress</h1>
      <Segmented
        className="sticky top-0 z-10 mt-3"
        value={sub}
        onChange={choose}
        options={[
          { value: 'calendar', label: 'Calendar' },
          { value: 'insights', label: 'Insights' },
          { value: 'urges', label: 'Urges' },
          { value: 'timeline', label: 'Timeline' },
        ]}
      />
      <div className="mt-5">
        {sub === 'calendar' && <Calendar />}
        {sub === 'insights' && <Insights />}
        {sub === 'urges' && <Urges />}
        {sub === 'timeline' && <Timeline />}
      </div>
    </div>
  )
}
