import { useEffect, useState } from 'react'

interface ToastItem {
  id: number
  message: string
}

type Listener = (items: ToastItem[]) => void

let items: ToastItem[] = []
let nextId = 1
const listeners = new Set<Listener>()

function emit() {
  for (const l of listeners) l(items.slice())
}

export function toast(message: string, durationMs = 3200): void {
  const id = nextId++
  items = [...items, { id, message }]
  emit()
  setTimeout(() => {
    items = items.filter(t => t.id !== id)
    emit()
  }, durationMs)
}

export function ToastHost() {
  const [list, setList] = useState<ToastItem[]>(items)
  useEffect(() => {
    listeners.add(setList)
    return () => { listeners.delete(setList) }
  }, [])

  if (list.length === 0) return null

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] flex flex-col items-center gap-2 px-4 w-full max-w-sm pointer-events-none">
      {list.map(t => (
        <div
          key={t.id}
          className="pointer-events-auto bg-gray-900/95 text-white text-sm font-medium px-4 py-2.5 rounded-xl shadow-lg backdrop-blur-sm animate-[fadeIn_0.2s_ease-out]"
          style={{ animation: 'wcToastIn 0.2s ease-out' }}
        >
          {t.message}
        </div>
      ))}
      <style>{`@keyframes wcToastIn { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: translateY(0); } }`}</style>
    </div>
  )
}
