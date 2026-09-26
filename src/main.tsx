import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { db } from './db/db'
import { ensureSeeded } from './db/seed'
import { DataScreen } from './ui/DataScreen'
import './index.css'

// Ask the browser not to evict IndexedDB under storage pressure. Not guaranteed on iOS.
void navigator.storage?.persist?.()

void ensureSeeded(db).then(() =>
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <DataScreen />
    </StrictMode>,
  ),
)
