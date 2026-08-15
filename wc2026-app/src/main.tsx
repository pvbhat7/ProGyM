import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
// Side-effect import — sets the persisted theme on <html> before React paints.
import './services/wcTheme'
import { captureRefFromUrl } from './services/referralCapture'
import App from './App'

// Grab any ?ref=CODE before React renders, so deep-links to /signup or any
// path correctly persist the referrer before the user navigates around.
captureRefFromUrl()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
)
