import { Navigate } from 'react-router-dom'
import { useMenuGate } from '../hooks/useMenuGate'

// Wrap routes that lagging / freshly-joined bonanza-only users shouldn't see.
// While the gate check is still in flight (ready === false) we render children
// to avoid a flash of Bonanza — the tab bar will filter itself once loaded.
export default function RequireFullAccess({ children }: { children: React.ReactNode }) {
  const gate = useMenuGate()
  if (gate.ready && gate.gated) return <Navigate to="/knockout-bonanza" replace />
  return <>{children}</>
}
