import { useEffect, useState } from 'react'
import { getMenuGate, subscribeMenuGate, loadMenuGate } from '../services/menuGate'
import { getSession } from '../services/wcSession'

export function useMenuGate() {
  const [snap, setSnap] = useState(getMenuGate())
  useEffect(() => {
    const s = getSession()
    if (s?.clientId) loadMenuGate(Number(s.clientId))
    return subscribeMenuGate(() => setSnap(getMenuGate()))
  }, [])
  return snap
}
