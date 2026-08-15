import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { API_BASE, MEDIA_BASE } from '../api/config'

type WorkoutPlan   = { id: string; name: string; discontinue: string }
type Exercise      = { id: string; name: string; mtid: string; gifFilePath: string; sets: string; reps: string; muscle: string; discontinue: string }
type MuscleRotation = { id: string; day: string; mainWorkoutName: string; subWorkoutName: string }
type PickedEx      = { name: string; gifFilePath: string; muscle: string; sets: string; reps: string }

const MUSCLE_OPTIONS = ['chest', 'shoulders', 'biceps', 'triceps', 'back', 'legs', 'abs', 'calves', 'forearms', 'cardio']

const MUSCLE_COLORS: Record<string, string> = {
  chest:     'bg-red-100 text-red-700',
  shoulders: 'bg-blue-100 text-blue-700',
  biceps:    'bg-green-100 text-green-700',
  triceps:   'bg-violet-100 text-violet-700',
  back:      'bg-amber-100 text-amber-700',
  legs:      'bg-teal-100 text-teal-700',
  abs:       'bg-pink-100 text-pink-700',
  calves:    'bg-indigo-100 text-indigo-700',
  forearms:  'bg-orange-100 text-orange-700',
  cardio:    'bg-rose-100 text-rose-700',
}

const ROTATION_PLAN_NAMES = [
  'Single Muscle - 1', 'Single Muscle - 2', 'Single Muscle - 3',
  'Double Muscle - 1', 'Double Muscle - 2', 'Double Muscle - 3',
  'Ladies Level - 3',
]
const DAY_ORDER = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

function muscleColor(muscle: string) {
  return MUSCLE_COLORS[muscle?.toLowerCase()] ?? 'bg-gray-100 text-gray-600'
}

function gifUrl(path: string): string {
  if (!path) return ''
  if (path.startsWith('http')) return path
  return MEDIA_BASE + (path.startsWith('/') ? path : '/' + path)
}

function isRotationPlan(name: string) { return ROTATION_PLAN_NAMES.includes(name) }

// ─── shared bottom-sheet ──────────────────────────────────────────────────────
function Sheet({ onClose, children }: { onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={onClose}>
      <div className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl shadow-2xl max-h-[90vh] flex flex-col"
        onClick={e => e.stopPropagation()}>
        {children}
      </div>
    </div>
  )
}

function SheetHeader({ title, onClose }: { title: string; onClose: () => void }) {
  return (
    <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
      <h3 className="font-semibold text-gray-800 text-base">{title}</h3>
      <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  )
}

// ─── Confirm sheet ────────────────────────────────────────────────────────────
function ConfirmSheet({ title, message, onConfirm, onClose, loading }: {
  title: string; message: string; onConfirm: () => void; onClose: () => void; loading: boolean
}) {
  return (
    <Sheet onClose={onClose}>
      <SheetHeader title={title} onClose={onClose} />
      <div className="px-5 py-4 space-y-4">
        <p className="text-sm text-gray-600">{message}</p>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-600 text-sm font-medium">Cancel</button>
          <button onClick={onConfirm} disabled={loading}
            className="flex-1 py-2.5 rounded-xl text-white text-sm font-semibold disabled:opacity-50"
            style={{ backgroundColor: '#dc2626' }}>
            {loading ? 'Removing…' : 'Confirm'}
          </button>
        </div>
      </div>
    </Sheet>
  )
}

// ─── Edit plan name ───────────────────────────────────────────────────────────
function EditPlanSheet({ initial, onSave, onClose, saving }: {
  initial: string; onSave: (name: string) => void; onClose: () => void; saving: boolean
}) {
  const [name, setName] = useState(initial)
  return (
    <Sheet onClose={onClose}>
      <SheetHeader title="Edit Plan Name" onClose={onClose} />
      <div className="px-5 py-4 space-y-4">
        <input
          value={name}
          onChange={e => setName(e.target.value)}
          className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
        />
        <button onClick={() => name.trim() && onSave(name.trim())} disabled={saving || !name.trim()}
          className="w-full py-3 rounded-xl text-white font-semibold text-sm disabled:opacity-50"
          style={{ backgroundColor: '#dc2626' }}>
          {saving ? 'Saving…' : 'Save'}
        </button>
      </div>
    </Sheet>
  )
}

// ─── Custom exercise form (inside wizard) ─────────────────────────────────────
function CustomExSheet({ onAdd, onClose }: { onAdd: (ex: PickedEx) => void; onClose: () => void }) {
  const [name,        setName]        = useState('')
  const [muscle,      setMuscle]      = useState('')
  const [sets,        setSets]        = useState('3')
  const [reps,        setReps]        = useState('12')
  const [gifFilePath, setGifFilePath] = useState('')
  const valid = name.trim() && muscle
  return (
    <Sheet onClose={onClose}>
      <SheetHeader title="Custom Exercise" onClose={onClose} />
      <div className="px-5 py-4 space-y-4 overflow-y-auto">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1.5">Exercise Name</label>
          <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Bench Press"
            className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-400" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1.5">Muscle Group</label>
          <div className="flex flex-wrap gap-2">
            {MUSCLE_OPTIONS.map(m => (
              <button key={m} onClick={() => setMuscle(m)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium capitalize border transition-colors ${
                  muscle === m ? 'text-white border-transparent' : 'bg-white text-gray-600 border-gray-200'
                }`}
                style={muscle === m ? { backgroundColor: '#dc2626' } : {}}>
                {m}
              </button>
            ))}
          </div>
        </div>
        <div className="flex gap-3">
          <div className="flex-1">
            <label className="block text-xs font-medium text-gray-500 mb-1.5">Sets</label>
            <input type="number" min="1" value={sets} onChange={e => setSets(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-center focus:outline-none focus:ring-2 focus:ring-red-400" />
          </div>
          <div className="flex-1">
            <label className="block text-xs font-medium text-gray-500 mb-1.5">Reps</label>
            <input type="number" min="1" value={reps} onChange={e => setReps(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-center focus:outline-none focus:ring-2 focus:ring-red-400" />
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1.5">GIF / Image URL (optional)</label>
          <input value={gifFilePath} onChange={e => setGifFilePath(e.target.value)} placeholder="Paste path or URL"
            className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-400" />
          {gifFilePath && (
            <div className="mt-2 rounded-xl overflow-hidden bg-gray-100 flex items-center justify-center h-24">
              <img src={gifUrl(gifFilePath)} alt="preview" className="max-h-full max-w-full object-contain"
                onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
            </div>
          )}
        </div>
        <button onClick={() => valid && onAdd({ name: name.trim(), muscle, sets, reps, gifFilePath })}
          disabled={!valid}
          className="w-full py-3 rounded-xl text-white font-semibold text-sm disabled:opacity-40"
          style={{ backgroundColor: '#dc2626' }}>
          Add to Plan
        </button>
      </div>
    </Sheet>
  )
}

// ─── Exercise form for editing an existing exercise in a plan ─────────────────
function ExerciseForm({ initial, onSave, onClose, saving }: {
  initial: Partial<Exercise>
  onSave: (data: Omit<Exercise, 'id' | 'mtid' | 'discontinue'>) => void
  onClose: () => void
  saving: boolean
}) {
  const [name,        setName]        = useState(initial.name        ?? '')
  const [muscle,      setMuscle]      = useState(initial.muscle      ?? '')
  const [sets,        setSets]        = useState(initial.sets        ?? '3')
  const [reps,        setReps]        = useState(initial.reps        ?? '12')
  const [gifFilePath, setGifFilePath] = useState(initial.gifFilePath ?? '')
  const valid = name.trim() && muscle
  return (
    <Sheet onClose={onClose}>
      <SheetHeader title={initial.id ? 'Edit Exercise' : 'Add Exercise'} onClose={onClose} />
      <div className="px-5 py-4 space-y-4 overflow-y-auto">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1.5">Exercise Name</label>
          <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Bench Press"
            className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-400" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1.5">Muscle Group</label>
          <div className="flex flex-wrap gap-2">
            {MUSCLE_OPTIONS.map(m => (
              <button key={m} onClick={() => setMuscle(m)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium capitalize border transition-colors ${
                  muscle === m ? 'text-white border-transparent' : 'bg-white text-gray-600 border-gray-200'
                }`}
                style={muscle === m ? { backgroundColor: '#dc2626' } : {}}>
                {m}
              </button>
            ))}
          </div>
        </div>
        <div className="flex gap-3">
          <div className="flex-1">
            <label className="block text-xs font-medium text-gray-500 mb-1.5">Sets</label>
            <input type="number" min="1" value={sets} onChange={e => setSets(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-center focus:outline-none focus:ring-2 focus:ring-red-400" />
          </div>
          <div className="flex-1">
            <label className="block text-xs font-medium text-gray-500 mb-1.5">Reps</label>
            <input type="number" min="1" value={reps} onChange={e => setReps(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-center focus:outline-none focus:ring-2 focus:ring-red-400" />
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1.5">GIF / Image URL (optional)</label>
          <input value={gifFilePath} onChange={e => setGifFilePath(e.target.value)} placeholder="Paste path or URL"
            className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-400" />
          {gifFilePath && (
            <div className="mt-2 rounded-xl overflow-hidden bg-gray-100 flex items-center justify-center h-24">
              <img src={gifUrl(gifFilePath)} alt="preview" className="max-h-full max-w-full object-contain"
                onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
            </div>
          )}
        </div>
        <button onClick={() => valid && onSave({ name: name.trim(), muscle, sets, reps, gifFilePath })}
          disabled={saving || !valid}
          className="w-full py-3 rounded-xl text-white font-semibold text-sm disabled:opacity-50"
          style={{ backgroundColor: '#dc2626' }}>
          {saving ? 'Saving…' : initial.id ? 'Save Changes' : 'Add Exercise'}
        </button>
      </div>
    </Sheet>
  )
}

// ─── Setup View (exercise library manager) ────────────────────────────────────
function SetupView({ plans, allExs, onClose, onRefresh }: {
  plans: WorkoutPlan[]
  allExs: Exercise[]
  onClose: () => void
  onRefresh: () => void
}) {
  const [muscleFilter, setMuscleFilter] = useState('')
  const [search,       setSearch]       = useState('')
  const [editingEx,    setEditingEx]    = useState<Exercise | null>(null)
  const [addingEx,     setAddingEx]     = useState(false)
  const [addPlanId,    setAddPlanId]    = useState(plans[0]?.id ?? '')
  const [saving,       setSaving]       = useState(false)

  const activeExs = useMemo(() => allExs.filter(e => e.discontinue !== 'true'), [allExs])

  const filtered = useMemo(() => activeExs.filter(e => {
    if (muscleFilter) {
      const hay = ((e.muscle ?? '') + ' ' + (e.name ?? '')).toLowerCase()
      if (!hay.includes(muscleFilter)) return false
    }
    if (search.trim() && !e.name.toLowerCase().includes(search.toLowerCase())) return false
    return true
  }), [activeExs, muscleFilter, search])

  const planName = (mtid: string) => plans.find(p => p.id === mtid)?.name ?? `Plan ${mtid}`

  async function handleEdit(data: Omit<Exercise, 'id' | 'mtid' | 'discontinue'>) {
    if (!editingEx) return
    setSaving(true)
    try {
      await fetch(`${API_BASE}/t_workoutsubtype/update.php`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, id: editingEx.id, mtid: editingEx.mtid, discontinue: editingEx.discontinue }),
      })
      setEditingEx(null); onRefresh()
    } finally { setSaving(false) }
  }

  async function handleAdd(data: Omit<Exercise, 'id' | 'mtid' | 'discontinue'>) {
    if (!addPlanId) return
    setSaving(true)
    try {
      await fetch(`${API_BASE}/t_workoutsubtype/create.php`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, mtid: addPlanId, discontinue: 'false', id: 0 }),
      })
      setAddingEx(false); onRefresh()
    } finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 z-50 bg-white flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3 flex-shrink-0">
        <button onClick={onClose} className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-gray-100 text-gray-500">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="flex-1">
          <p className="font-bold text-gray-800 text-base">Exercise Library</p>
          <p className="text-xs text-gray-400">{activeExs.length} exercises across all plans</p>
        </div>
        <button onClick={() => setAddingEx(true)}
          className="px-4 py-2 rounded-xl font-bold text-sm text-white flex-shrink-0"
          style={{ backgroundColor: '#dc2626' }}>
          + Add Exercise
        </button>
      </div>

      {/* Search + muscle filter */}
      <div className="bg-white border-b border-gray-100 px-4 py-3 space-y-2 flex-shrink-0">
        <input
          value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search exercises…"
          className="w-full border border-gray-200 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
        />
        <div className="flex gap-2 overflow-x-auto pb-0.5">
          <button onClick={() => setMuscleFilter('')}
            className="flex-shrink-0 px-3 py-1 rounded-full text-xs font-medium border"
            style={!muscleFilter ? { backgroundColor: '#dc2626', color: '#fff', borderColor: '#dc2626' } : { backgroundColor: '#fff', color: '#4b5563', borderColor: '#e5e7eb' }}>
            All
          </button>
          {MUSCLE_OPTIONS.map(m => (
            <button key={m} onClick={() => setMuscleFilter(f => f === m ? '' : m)}
              className="flex-shrink-0 px-3 py-1 rounded-full text-xs font-medium border capitalize"
              style={muscleFilter === m ? { backgroundColor: '#dc2626', color: '#fff', borderColor: '#dc2626' } : { backgroundColor: '#fff', color: '#4b5563', borderColor: '#e5e7eb' }}>
              {m}
            </button>
          ))}
        </div>
      </div>

      {/* Exercise list */}
      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <div className="text-4xl mb-2">🔍</div>
            <p>No exercises found</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filtered.map(ex => (
              <div key={ex.id} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50">
                {/* Thumbnail */}
                <div style={{ width: '60px', height: '48px', borderRadius: '8px', overflow: 'hidden', backgroundColor: '#f3f4f6', flexShrink: 0 }}>
                  {ex.gifFilePath ? (
                    <img src={gifUrl(ex.gifFilePath)} alt={ex.name}
                      style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                      onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
                  ) : (
                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>💪</div>
                  )}
                </div>
                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-800 text-sm truncate">{ex.name}</p>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    {ex.muscle && (
                      <span className={`text-xs px-1.5 py-0.5 rounded-full capitalize font-medium ${muscleColor(ex.muscle)}`}>{ex.muscle}</span>
                    )}
                    <span className="text-xs text-gray-400">{ex.sets}×{ex.reps}</span>
                    <span className="text-xs text-gray-300 truncate">{planName(ex.mtid)}</span>
                  </div>
                </div>
                {/* Edit */}
                <button onClick={() => setEditingEx(ex)}
                  className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-gray-100 text-gray-400 flex-shrink-0">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add exercise sheet — includes plan picker */}
      {addingEx && (
        <Sheet onClose={() => setAddingEx(false)}>
          <SheetHeader title="Add Exercise" onClose={() => setAddingEx(false)} />
          <div className="px-5 py-3 border-b border-gray-100">
            <label className="block text-xs font-medium text-gray-500 mb-1.5">Add to Plan</label>
            <select value={addPlanId} onChange={e => setAddPlanId(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 bg-white">
              {plans.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div className="flex-1 overflow-y-auto">
            <SetupExerciseFields saving={saving} onSave={handleAdd} />
          </div>
        </Sheet>
      )}

      {/* Edit exercise sheet */}
      {editingEx && (
        <ExerciseForm initial={editingEx} onSave={handleEdit} onClose={() => setEditingEx(null)} saving={saving} />
      )}
    </div>
  )
}

// Inline exercise fields for SetupView add sheet (reuses ExerciseForm internals)
function SetupExerciseFields({ saving, onSave }: {
  saving: boolean
  onSave: (data: Omit<Exercise, 'id' | 'mtid' | 'discontinue'>) => void
}) {
  const [name,        setName]        = useState('')
  const [muscle,      setMuscle]      = useState('')
  const [sets,        setSets]        = useState('3')
  const [reps,        setReps]        = useState('12')
  const [gifFilePath, setGifFilePath] = useState('')
  const valid = name.trim() && muscle
  return (
    <div className="px-5 py-4 space-y-4">
      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1.5">Exercise Name</label>
        <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Bench Press"
          className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-400" />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1.5">Muscle Group</label>
        <div className="flex flex-wrap gap-2">
          {MUSCLE_OPTIONS.map(m => (
            <button key={m} onClick={() => setMuscle(m)}
              className="px-3 py-1.5 rounded-full text-xs font-medium capitalize border"
              style={muscle === m ? { backgroundColor: '#dc2626', color: '#fff', borderColor: '#dc2626' } : { backgroundColor: '#fff', color: '#4b5563', borderColor: '#e5e7eb' }}>
              {m}
            </button>
          ))}
        </div>
      </div>
      <div className="flex gap-3">
        <div className="flex-1">
          <label className="block text-xs font-medium text-gray-500 mb-1.5">Sets</label>
          <input type="number" min="1" value={sets} onChange={e => setSets(e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-center focus:outline-none focus:ring-2 focus:ring-red-400" />
        </div>
        <div className="flex-1">
          <label className="block text-xs font-medium text-gray-500 mb-1.5">Reps</label>
          <input type="number" min="1" value={reps} onChange={e => setReps(e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-center focus:outline-none focus:ring-2 focus:ring-red-400" />
        </div>
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1.5">GIF / Image path (optional)</label>
        <input value={gifFilePath} onChange={e => setGifFilePath(e.target.value)} placeholder="Paste path or URL"
          className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-400" />
        {gifFilePath && (
          <div className="mt-2 rounded-xl overflow-hidden bg-gray-100 flex items-center justify-center h-24">
            <img src={gifUrl(gifFilePath)} alt="preview" className="max-h-full max-w-full object-contain"
              onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
          </div>
        )}
      </div>
      <button onClick={() => valid && onSave({ name: name.trim(), muscle, sets, reps, gifFilePath })}
        disabled={saving || !valid}
        className="w-full py-3 rounded-xl font-bold text-sm disabled:opacity-40 text-white"
        style={{ backgroundColor: '#dc2626' }}>
        {saving ? 'Saving…' : 'Add Exercise'}
      </button>
    </div>
  )
}

// ─── Muscle Rotation day-assignment sheet ────────────────────────────────────
function MuscleRotationSheet({ initial, plans, mainWorkoutName, onSave, onClose, saving }: {
  initial: Partial<MuscleRotation>
  plans: WorkoutPlan[]
  mainWorkoutName: string
  onSave: (data: Omit<MuscleRotation, 'id'>) => void
  onClose: () => void
  saving: boolean
}) {
  const [day,            setDay]           = useState(initial.day ?? 'Monday')
  const [subWorkoutName, setSubWorkoutName] = useState(initial.subWorkoutName ?? '')
  const [planSearch,     setPlanSearch]    = useState('')

  const activePlans = useMemo(() =>
    plans.filter(p => p.discontinue !== 'true' &&
      (!planSearch.trim() || p.name.toLowerCase().includes(planSearch.toLowerCase())))
  , [plans, planSearch])

  const isEditing = !!initial.id

  return (
    <Sheet onClose={onClose}>
      <SheetHeader title={isEditing ? 'Edit Day Assignment' : 'Add Day Assignment'} onClose={onClose} />
      <div className="px-5 py-4 space-y-4 overflow-y-auto" style={{ maxHeight: '70vh' }}>
        {/* Fixed plan label */}
        <div style={{ background: '#f3f4f6', borderRadius: '10px', padding: '8px 12px' }}>
          <p style={{ fontSize: '10px', color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Rotation Plan</p>
          <p style={{ fontSize: '13px', fontWeight: 700, color: '#111827' }}>{mainWorkoutName}</p>
        </div>

        {/* Day picker */}
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1.5">Day of Week</label>
          <div className="flex flex-wrap gap-2">
            {DAY_ORDER.map(d => (
              <button key={d} onClick={() => setDay(d)}
                className="px-3 py-1.5 rounded-full text-xs font-medium border"
                style={day === d
                  ? { backgroundColor: '#dc2626', color: '#fff', borderColor: '#dc2626' }
                  : { backgroundColor: '#fff', color: '#374151', borderColor: '#e5e7eb' }}>
                {d.slice(0, 3)}
              </button>
            ))}
          </div>
        </div>

        {/* Sub-plan picker */}
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1.5">Assign Plan (sub-workout)</label>
          <input
            value={planSearch} onChange={e => setPlanSearch(e.target.value)}
            placeholder="Search plans…"
            className="w-full border border-gray-200 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 mb-2"
          />
          <div style={{ maxHeight: '180px', overflowY: 'auto', borderRadius: '12px', border: '1px solid #e5e7eb' }}>
            {activePlans.length === 0 ? (
              <p style={{ padding: '12px', fontSize: '12px', color: '#9ca3af', textAlign: 'center' }}>No plans found</p>
            ) : activePlans.map(p => (
              <button key={p.id} onClick={() => setSubWorkoutName(p.name)}
                style={{ width: '100%', textAlign: 'left', padding: '9px 14px', fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'none', border: 'none', borderBottom: '1px solid #f9fafb', cursor: 'pointer' }}>
                <span style={{ color: subWorkoutName === p.name ? '#dc2626' : '#374151', fontWeight: subWorkoutName === p.name ? 700 : 400 }}>{p.name}</span>
                {subWorkoutName === p.name && <span style={{ color: '#dc2626', fontWeight: 700 }}>✓</span>}
              </button>
            ))}
          </div>
          {subWorkoutName && (
            <p style={{ fontSize: '11px', color: '#6b7280', marginTop: '6px' }}>
              Selected: <strong style={{ color: '#374151' }}>{subWorkoutName}</strong>
            </p>
          )}
        </div>

        <button
          onClick={() => subWorkoutName && onSave({ day, mainWorkoutName, subWorkoutName })}
          disabled={saving || !subWorkoutName}
          className="w-full py-3 rounded-xl text-white font-semibold text-sm disabled:opacity-50"
          style={{ backgroundColor: '#dc2626' }}>
          {saving ? 'Saving…' : isEditing ? 'Save Changes' : 'Add Assignment'}
        </button>
      </div>
    </Sheet>
  )
}

const ROTATION_SUGGESTIONS = [
  'Single Muscle - 1', 'Single Muscle - 2', 'Single Muscle - 3',
  'Double Muscle - 1', 'Double Muscle - 2', 'Double Muscle - 3',
  'Ladies Level - 1', 'Ladies Level - 2', 'Ladies Level - 3',
]

// ─── Create Plan Wizard (full-screen, 2 steps) ────────────────────────────────
function CreatePlanWizard({ plans, allExs, onSave, onClose, saving }: {
  plans: WorkoutPlan[]
  allExs: Exercise[]
  onSave: (name: string, exercises: PickedEx[], dayPlanSelection?: Record<string, string>) => void
  onClose: () => void
  saving: boolean
}) {
  const [step,          setStep]         = useState<'name' | 'exercises'>('name')
  const [planType,      setPlanType]     = useState<'regular' | 'rotation'>('regular')
  const [planName,      setPlanName]     = useState('')
  const [muscleFilter,  setMuscleFilter] = useState('')
  const [search,        setSearch]       = useState('')
  const [picked,        setPicked]       = useState<PickedEx[]>([])
  const [editingIdx,    setEditingIdx]   = useState<number | null>(null)
  const [showCustom,    setShowCustom]   = useState(false)
  const [dayPlanSel,    setDayPlanSel]   = useState<Record<string, string>>({})
  const [activeDay,     setActiveDay]    = useState('Monday')
  const [wizPlanSearch, setWizPlanSearch]= useState('')
  const [showPreview,   setShowPreview]  = useState(false)

  // Deduplicated exercise library by name
  const library = useMemo(() => {
    const seen = new Set<string>()
    const result: Exercise[] = []
    allExs.forEach(e => {
      const key = e.name.toLowerCase().trim()
      if (!seen.has(key)) { seen.add(key); result.push(e) }
    })
    return result
  }, [allExs])

  const filtered = useMemo(() => library.filter(e => {
    if (muscleFilter) {
      const hay = ((e.muscle ?? '') + ' ' + (e.name ?? '')).toLowerCase()
      if (!hay.includes(muscleFilter)) return false
    }
    if (search.trim() && !e.name.toLowerCase().includes(search.toLowerCase())) return false
    return true
  }), [library, muscleFilter, search])

  const wizExCountByPlan = useMemo(() => {
    const m: Record<string, number> = {}
    allExs.forEach(e => { m[e.mtid] = (m[e.mtid] ?? 0) + 1 })
    return m
  }, [allExs])

  const activePlansForPicker = useMemo(() =>
    plans
      .filter(p => p.discontinue !== 'true')
      .filter(p => !wizPlanSearch.trim() || p.name.toLowerCase().includes(wizPlanSearch.toLowerCase()))
  , [plans, wizPlanSearch])

  function isPickedByName(name: string) {
    return picked.some(p => p.name.toLowerCase() === name.toLowerCase())
  }

  function togglePick(ex: Exercise) {
    if (isPickedByName(ex.name)) {
      setPicked(prev => prev.filter(p => p.name.toLowerCase() !== ex.name.toLowerCase()))
    } else {
      setPicked(prev => [...prev, {
        name: ex.name, gifFilePath: ex.gifFilePath,
        muscle: ex.muscle, sets: ex.sets || '3', reps: ex.reps || '12',
      }])
    }
  }

  // ── Step 1: type + name ──
  if (step === 'name') {
    const canProceed = planName.trim().length > 0
    return (
      <div style={{ position: 'fixed', inset: 0, zIndex: 50, background: '#fff', display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', borderBottom: '1px solid #e5e7eb' }}>
          <button onClick={onClose}
            style={{ width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '10px', border: 'none', background: 'transparent', cursor: 'pointer', color: '#6b7280' }}>
            <svg style={{ width: '20px', height: '20px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <p style={{ fontWeight: 700, fontSize: '15px', color: '#111827', flex: 1 }}>New Workout Plan</p>
          {planType === 'regular' && (
            <span style={{ fontSize: '11px', color: '#9ca3af', background: '#f3f4f6', padding: '3px 8px', borderRadius: '999px' }}>Step 1 / 2</span>
          )}
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '24px 24px 32px' }}>

          {/* Plan type toggle */}
          <p style={{ fontSize: '11px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '10px' }}>Plan Type</p>
          <div style={{ display: 'flex', gap: '10px', marginBottom: '28px' }}>
            {(['regular', 'rotation'] as const).map(t => (
              <button key={t} onClick={() => { setPlanType(t); setPlanName('') }}
                style={{
                  flex: 1, padding: '14px 10px', borderRadius: '14px', border: `2px solid ${planType === t ? '#dc2626' : '#e5e7eb'}`,
                  background: planType === t ? '#fff1f2' : '#fff', cursor: 'pointer', textAlign: 'left',
                }}>
                <p style={{ fontWeight: 700, fontSize: '14px', color: planType === t ? '#dc2626' : '#374151', marginBottom: '3px' }}>
                  {t === 'regular' ? '🏋️ Regular' : '🔄 Rotation'}
                </p>
                <p style={{ fontSize: '11px', color: '#9ca3af', lineHeight: 1.4 }}>
                  {t === 'regular'
                    ? 'Fixed exercise list you define manually'
                    : 'Server auto-assigns exercises by day of week'}
                </p>
              </button>
            ))}
          </div>

          {/* Name section */}
          {planType === 'regular' ? (
            <>
              <p style={{ fontSize: '11px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>Plan Name</p>
              <input
                autoFocus
                value={planName}
                onChange={e => setPlanName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && canProceed && setStep('exercises')}
                placeholder="e.g. Push Pull Legs"
                style={{ width: '100%', border: '2px solid #e5e7eb', borderRadius: '14px', padding: '13px 16px', fontSize: '15px', outline: 'none', boxSizing: 'border-box', marginBottom: '24px' }}
              />
              <button onClick={() => canProceed && setStep('exercises')} disabled={!canProceed}
                style={{ width: '100%', padding: '14px', borderRadius: '14px', border: 'none', backgroundColor: canProceed ? '#dc2626' : '#e5e7eb', color: canProceed ? '#fff' : '#9ca3af', fontWeight: 700, fontSize: '14px', cursor: canProceed ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                <span>Next: Add Exercises</span><span>→</span>
              </button>
            </>
          ) : (
            <>
              <p style={{ fontSize: '11px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>Quick Pick</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '20px' }}>
                {ROTATION_SUGGESTIONS.map(s => (
                  <button key={s} onClick={() => setPlanName(s)}
                    style={{ padding: '7px 13px', borderRadius: '999px', border: `1.5px solid ${planName === s ? '#dc2626' : '#e5e7eb'}`, background: planName === s ? '#fff1f2' : '#fff', fontSize: '12px', fontWeight: 600, color: planName === s ? '#dc2626' : '#374151', cursor: 'pointer' }}>
                    {s}
                  </button>
                ))}
              </div>
              <p style={{ fontSize: '11px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>Or enter custom name</p>
              <input
                value={planName}
                onChange={e => setPlanName(e.target.value)}
                placeholder="e.g. Single Muscle - 4"
                style={{ width: '100%', border: '2px solid #e5e7eb', borderRadius: '14px', padding: '13px 16px', fontSize: '15px', outline: 'none', boxSizing: 'border-box', marginBottom: '16px' }}
              />
              <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '12px', padding: '12px 14px', marginBottom: '24px' }}>
                <p style={{ fontSize: '12px', color: '#92400e', fontWeight: 600, marginBottom: '3px' }}>ℹ️ How rotation plans work</p>
                <p style={{ fontSize: '11px', color: '#b45309', lineHeight: 1.5 }}>
                  The server assigns exercises per day of week based on the plan name. For the auto-rotation to work, the plan name must match an entry in the server's rotation schedule (muscleworkout table).
                </p>
              </div>
              <button onClick={() => canProceed && setStep('exercises')} disabled={!canProceed}
                style={{ width: '100%', padding: '14px', borderRadius: '14px', border: 'none', backgroundColor: canProceed ? '#dc2626' : '#e5e7eb', color: canProceed ? '#fff' : '#9ca3af', fontWeight: 700, fontSize: '14px', cursor: canProceed ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                <span>Next: Add Exercises by Day</span><span>→</span>
              </button>
            </>
          )}
        </div>
      </div>
    )
  }

  // ── Step 2: exercise browser / plan picker ──
  const isRotationMode = planType === 'rotation'
  const assignedDaysCount = DAY_ORDER.filter(d => !!dayPlanSel[d]).length

  // ── Preview (rotation mode only) ──
  if (showPreview) {
    return (
      <div style={{ position: 'fixed', inset: 0, zIndex: 55, background: '#f9fafb', display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <div style={{ background: '#fff', borderBottom: '1px solid #e5e7eb', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
          <button onClick={() => setShowPreview(false)}
            style={{ width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '10px', border: 'none', background: 'transparent', cursor: 'pointer', color: '#6b7280', flexShrink: 0 }}>
            <svg style={{ width: '20px', height: '20px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontWeight: 700, fontSize: '15px', color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{planName}</p>
            <p style={{ fontSize: '11px', color: '#9ca3af' }}>
              Preview · {assignedDaysCount} of 7 days assigned
            </p>
          </div>
          <button onClick={() => onSave(planName, [], dayPlanSel)} disabled={saving}
            style={{ padding: '8px 16px', borderRadius: '12px', border: 'none', backgroundColor: saving ? '#e5e7eb' : '#dc2626', color: saving ? '#9ca3af' : '#fff', fontWeight: 700, fontSize: '13px', cursor: saving ? 'default' : 'pointer', flexShrink: 0 }}>
            {saving ? 'Creating…' : `Create (${assignedDaysCount})`}
          </button>
        </div>

        {/* Day cards */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {DAY_ORDER.map(day => {
            const planId = dayPlanSel[day]
            const plan   = plans.find(p => p.id === planId)
            const exs    = planId ? allExs.filter(e => e.mtid === planId && e.discontinue !== 'true') : []
            return (
              <div key={day} style={{ background: '#fff', borderRadius: '16px', overflow: 'hidden', border: `1px solid ${planId ? '#fecdd3' : '#e5e7eb'}` }}>
                {/* Day header */}
                <div style={{ padding: '11px 16px', background: planId ? '#fff1f2' : '#f9fafb', borderBottom: '1px solid #f3f4f6', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontWeight: 700, fontSize: '14px', color: planId ? '#dc2626' : '#9ca3af' }}>{day}</p>
                    {plan ? (
                      <p style={{ fontSize: '11px', color: '#9ca3af', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{plan.name} · {exs.length} exercise{exs.length !== 1 ? 's' : ''}</p>
                    ) : (
                      <p style={{ fontSize: '11px', color: '#d1d5db', marginTop: '2px' }}>No plan assigned</p>
                    )}
                  </div>
                  <button onClick={() => { setShowPreview(false); setActiveDay(day) }}
                    style={{ fontSize: '11px', fontWeight: 600, background: 'none', border: `1px solid ${planId ? '#fecdd3' : '#e5e7eb'}`, cursor: 'pointer', padding: '4px 10px', borderRadius: '8px', color: planId ? '#dc2626' : '#9ca3af', flexShrink: 0 }}>
                    {planId ? 'Change' : '+ Assign'}
                  </button>
                </div>
                {/* Exercise grid */}
                {exs.length > 0 ? (
                  <div style={{ padding: '10px', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                    {exs.map(ex => (
                      <div key={ex.id} style={{ background: '#f9fafb', borderRadius: '10px', overflow: 'hidden', border: '1px solid #f3f4f6' }}>
                        {ex.gifFilePath ? (
                          <img src={gifUrl(ex.gifFilePath)} alt={ex.name}
                            style={{ width: '100%', height: 'auto', display: 'block' }}
                            onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
                        ) : (
                          <div style={{ width: '100%', height: '60px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', background: '#f3f4f6' }}>💪</div>
                        )}
                        <div style={{ padding: '4px 6px 6px' }}>
                          <p style={{ fontSize: '11px', fontWeight: 600, color: '#1f2937', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ex.name}</p>
                          {ex.muscle && (
                            <span style={{ fontSize: '9px', padding: '1px 5px', borderRadius: '999px', fontWeight: 600, textTransform: 'capitalize', backgroundColor: '#f3f4f6', color: '#4b5563', display: 'inline-block', marginTop: '2px' }}>{ex.muscle}</span>
                          )}
                          <p style={{ fontSize: '10px', color: '#9ca3af', marginTop: '1px' }}>{ex.sets}×{ex.reps}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p style={{ padding: '14px 16px', fontSize: '12px', color: '#9ca3af', textAlign: 'center' }}>
                    {planId ? 'No exercises in this plan yet' : 'Tap "+ Assign" to add a plan for this day'}
                  </p>
                )}
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ backgroundColor: '#f9fafb' }}>
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3">
        <button onClick={() => setStep('name')} className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-gray-100 text-gray-500 flex-shrink-0">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-gray-800 text-sm truncate">{planName}</p>
          <p className="text-xs text-gray-400">
            {isRotationMode
              ? `${assignedDaysCount} of 7 days assigned`
              : `${picked.length} exercise${picked.length !== 1 ? 's' : ''} selected`}
          </p>
        </div>
        {isRotationMode && assignedDaysCount > 0 && (
          <button onClick={() => setShowPreview(true)}
            className="px-3 py-2 rounded-xl font-bold text-sm flex-shrink-0"
            style={{ backgroundColor: '#1f2937', color: '#fff' }}>
            Preview
          </button>
        )}
        <button
          onClick={() => isRotationMode ? onSave(planName, [], dayPlanSel) : onSave(planName, picked)}
          disabled={saving}
          className="px-4 py-2 rounded-xl font-bold text-sm disabled:opacity-50 flex-shrink-0"
          style={{ backgroundColor: '#dc2626', color: '#fff' }}
        >
          {saving ? 'Creating…'
            : isRotationMode
              ? `Create${assignedDaysCount > 0 ? ` (${assignedDaysCount} days)` : ''}`
              : `Create Plan${picked.length > 0 ? ` (${picked.length})` : ''}`}
        </button>
      </div>

      {isRotationMode ? (
        <>
          {/* Day tabs */}
          <div style={{ display: 'flex', overflowX: 'auto', padding: '10px 12px', gap: '8px', borderBottom: '1px solid #e5e7eb', background: '#fff', flexShrink: 0 }}>
            {DAY_ORDER.map(day => {
              const assigned = !!dayPlanSel[day]
              const isActive = activeDay === day
              return (
                <button key={day} onClick={() => setActiveDay(day)}
                  style={{
                    flexShrink: 0, padding: '5px 12px', borderRadius: '999px',
                    border: `1.5px solid ${isActive ? '#dc2626' : assigned ? '#fca5a5' : '#e5e7eb'}`,
                    background: isActive ? '#dc2626' : assigned ? '#fff1f2' : '#fff',
                    color: isActive ? '#fff' : assigned ? '#dc2626' : '#6b7280',
                    fontWeight: 600, fontSize: '12px', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: '4px',
                  }}>
                  <span>{day.slice(0, 3)}</span>
                  {assigned && (
                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: isActive ? 'rgba(255,255,255,0.8)' : '#dc2626', display: 'inline-block', flexShrink: 0 }} />
                  )}
                </button>
              )
            })}
          </div>

          {/* Plan picker */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            {dayPlanSel[activeDay] && (
              <div style={{ padding: '8px 16px', background: '#fff1f2', borderBottom: '1px solid #fecdd3', flexShrink: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '11px', color: '#6b7280' }}>{activeDay}:</span>
                <span style={{ fontSize: '12px', fontWeight: 700, color: '#dc2626', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {plans.find(p => p.id === dayPlanSel[activeDay])?.name}
                </span>
                <button onClick={() => setDayPlanSel(prev => { const n = { ...prev }; delete n[activeDay]; return n })}
                  style={{ fontSize: '11px', color: '#ef4444', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', padding: '2px 6px', flexShrink: 0 }}>
                  Clear
                </button>
              </div>
            )}
            <div style={{ padding: '10px 12px', background: '#fff', borderBottom: '1px solid #f3f4f6', flexShrink: 0 }}>
              <input value={wizPlanSearch} onChange={e => setWizPlanSearch(e.target.value)} placeholder="Search plans…"
                style={{ width: '100%', border: '1px solid #e5e7eb', borderRadius: '10px', padding: '8px 12px', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }} />
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <p style={{ fontSize: '11px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 4px 4px', flexShrink: 0 }}>
                Select plan for {activeDay}
              </p>
              {activePlansForPicker.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '32px 0', color: '#9ca3af', fontSize: '13px' }}>No plans found</div>
              ) : activePlansForPicker.map(plan => {
                const isSelected = dayPlanSel[activeDay] === plan.id
                const exCount = wizExCountByPlan[plan.id] ?? 0
                return (
                  <button key={plan.id}
                    onClick={() => setDayPlanSel(prev => {
                      if (isSelected) { const n = { ...prev }; delete n[activeDay]; return n }
                      return { ...prev, [activeDay]: plan.id }
                    })}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 14px',
                      borderRadius: '14px', border: `2px solid ${isSelected ? '#dc2626' : '#e5e7eb'}`,
                      background: isSelected ? '#fff1f2' : '#fff', cursor: 'pointer', textAlign: 'left', width: '100%',
                    }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontWeight: 600, fontSize: '13px', color: isSelected ? '#dc2626' : '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {plan.name}
                      </p>
                      <p style={{ fontSize: '11px', color: '#9ca3af', marginTop: '2px' }}>
                        {exCount} exercise{exCount !== 1 ? 's' : ''}
                      </p>
                    </div>
                    {isSelected && (
                      <div style={{ width: '22px', height: '22px', borderRadius: '50%', backgroundColor: '#dc2626', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 700, flexShrink: 0 }}>✓</div>
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        </>
      ) : (
        <>
          {/* Search + muscle filter */}
          <div className="bg-white border-b border-gray-100 px-4 py-3 space-y-2">
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search exercises…"
              className="w-full border border-gray-200 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
            />
            <div className="flex gap-2 overflow-x-auto pb-0.5">
              <button onClick={() => setMuscleFilter('')}
                className="flex-shrink-0 px-3 py-1 rounded-full text-xs font-medium border"
                style={!muscleFilter ? { backgroundColor: '#dc2626', color: '#fff', borderColor: '#dc2626' } : { backgroundColor: '#fff', color: '#4b5563', borderColor: '#e5e7eb' }}>
                All
              </button>
              {MUSCLE_OPTIONS.map(m => (
                <button key={m} onClick={() => setMuscleFilter(f => f === m ? '' : m)}
                  className="flex-shrink-0 px-3 py-1 rounded-full text-xs font-medium border capitalize"
                  style={muscleFilter === m ? { backgroundColor: '#dc2626', color: '#fff', borderColor: '#dc2626' } : { backgroundColor: '#fff', color: '#4b5563', borderColor: '#e5e7eb' }}>
                  {m}
                </button>
              ))}
            </div>
          </div>

          {/* Exercise grid */}
          <div className="flex-1 overflow-y-auto p-4" style={{ paddingBottom: picked.length > 0 ? '148px' : '24px' }}>
            {filtered.length === 0 && library.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <div className="text-4xl mb-2">📚</div>
                <p className="font-medium text-gray-500">No exercises in library yet</p>
                <p className="text-sm mt-1">Use "Custom Exercise" below to add one</p>
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <div className="text-4xl mb-2">🔍</div>
                <p>No exercises match</p>
              </div>
            ) : null}

            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {filtered.map(ex => {
                const sel = isPickedByName(ex.name)
                return (
                  <button key={ex.id} onClick={() => togglePick(ex)}
                    style={{ position: 'relative', background: '#fff', borderRadius: '10px', overflow: 'hidden', textAlign: 'left', border: sel ? '2px solid #dc2626' : '2px solid #e5e7eb', boxShadow: sel ? '0 2px 8px rgba(220,38,38,0.18)' : 'none', display: 'block', width: '100%' }}>
                    {sel && (
                      <div style={{ position: 'absolute', top: '6px', right: '6px', width: '18px', height: '18px', borderRadius: '50%', backgroundColor: '#dc2626', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 700, zIndex: 10 }}>✓</div>
                    )}
                    {ex.gifFilePath ? (
                      <img src={gifUrl(ex.gifFilePath)} alt={ex.name}
                        style={{ width: '100%', height: 'auto', display: 'block' }}
                        onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
                    ) : (
                      <div style={{ width: '100%', height: '72px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', backgroundColor: '#f3f4f6' }}>💪</div>
                    )}
                    <div style={{ padding: '5px 6px 6px' }}>
                      <p style={{ fontSize: '12px', fontWeight: 600, color: '#1f2937', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ex.name}</p>
                      <p style={{ fontSize: '11px', color: '#9ca3af', marginTop: '1px' }}>{ex.sets}×{ex.reps}</p>
                    </div>
                  </button>
                )
              })}
              <button onClick={() => setShowCustom(true)}
                className="bg-white rounded-xl p-2 flex flex-col items-center justify-center gap-1 text-center"
                style={{ border: '2px dashed #e5e7eb', minHeight: '100px' }}>
                <span className="text-2xl text-gray-300">+</span>
                <p className="font-semibold text-gray-400" style={{ fontSize: '10px' }}>Custom</p>
              </button>
            </div>
          </div>

          {/* Tray */}
          {picked.length > 0 && (
            <div className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 pt-3 pb-5 shadow-2xl">
              <p className="text-xs font-bold text-gray-400 mb-2 uppercase tracking-wide">
                {`${picked.length} selected — tap to edit sets / reps`}
              </p>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {picked.map((p, i) => (
                  <button key={i} onClick={() => setEditingIdx(i)}
                    className="flex-shrink-0 rounded-xl px-3 py-2 text-left"
                    style={{ backgroundColor: '#fff1f2', border: '1px solid #fecdd3' }}>
                    <p className="text-xs font-semibold text-gray-800 whitespace-nowrap" style={{ maxWidth: '100px', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</p>
                    <p className="text-xs font-bold" style={{ color: '#dc2626' }}>{p.sets}×{p.reps}</p>
                  </button>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Edit sets/reps — regular mode */}
      {editingIdx !== null && picked[editingIdx] && (
        <div className="fixed inset-0 flex items-end sm:items-center justify-center bg-black/40"
          style={{ zIndex: 60 }} onClick={() => setEditingIdx(null)}>
          <div className="bg-white w-full sm:max-w-sm rounded-t-3xl sm:rounded-2xl p-5 space-y-4"
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-gray-800 text-sm truncate" style={{ maxWidth: '200px' }}>
                {picked[editingIdx].name}
              </h3>
              <button onClick={() => { setPicked(prev => prev.filter((_, i) => i !== editingIdx!)); setEditingIdx(null) }}
                className="text-xs font-semibold" style={{ color: '#dc2626' }}>Remove</button>
            </div>
            <div className="flex gap-4">
              <div className="flex-1">
                <label className="block text-xs text-gray-500 mb-1.5">Sets</label>
                <input type="number" min="1"
                  value={picked[editingIdx].sets}
                  onChange={e => setPicked(prev => prev.map((p, i) => i === editingIdx! ? { ...p, sets: e.target.value } : p))}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-center focus:outline-none focus:ring-2 focus:ring-red-400"
                />
              </div>
              <div className="flex-1">
                <label className="block text-xs text-gray-500 mb-1.5">Reps</label>
                <input type="number" min="1"
                  value={picked[editingIdx].reps}
                  onChange={e => setPicked(prev => prev.map((p, i) => i === editingIdx! ? { ...p, reps: e.target.value } : p))}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-center focus:outline-none focus:ring-2 focus:ring-red-400"
                />
              </div>
            </div>
            <button onClick={() => setEditingIdx(null)}
              className="w-full py-3 rounded-xl font-bold text-sm text-white"
              style={{ backgroundColor: '#dc2626' }}>Done</button>
          </div>
        </div>
      )}

      {showCustom && (
        <CustomExSheet
          onAdd={ex => { setPicked(prev => [...prev, ex]); setShowCustom(false) }}
          onClose={() => setShowCustom(false)}
        />
      )}
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function AdminWorkoutsPage() {
  const navigate = useNavigate()

  const [plans,     setPlans]     = useState<WorkoutPlan[] | null>(null)
  const [allExs,    setAllExs]    = useState<Exercise[]>([])
  const [rotations, setRotations] = useState<MuscleRotation[]>([])

  const [selectedPlan,  setSelectedPlan]  = useState<WorkoutPlan | null>(null)
  const [planExercises, setPlanExercises] = useState<Exercise[] | null>(null)
  const [loadingExs,    setLoadingExs]    = useState(false)
  const [showRotation,  setShowRotation]  = useState(false)

  const [showCreatePlan, setShowCreatePlan] = useState(false)
  const [showSetup,      setShowSetup]      = useState(false)
  const [editingPlan,    setEditingPlan]    = useState<WorkoutPlan | null>(null)
  const [disablingPlan,  setDisablingPlan]  = useState<WorkoutPlan | null>(null)
  const [showCreateEx,   setShowCreateEx]   = useState(false)
  const [editingEx,      setEditingEx]      = useState<Exercise | null>(null)
  const [disablingEx,    setDisablingEx]    = useState<Exercise | null>(null)
  const [saving,         setSaving]         = useState(false)
  const [planSearch,     setPlanSearch]     = useState('')
  const [mobilePane,     setMobilePane]     = useState<'list' | 'detail'>('list')
  const [editingRotation,  setEditingRotation]  = useState<MuscleRotation | null>(null)
  const [addingRotation,   setAddingRotation]   = useState(false)
  const [deletingRotation, setDeletingRotation] = useState<MuscleRotation | null>(null)

  useEffect(() => {
    fetchPlans()
    fetch(`${API_BASE}/t_workoutsubtype/getAll.php`)
      .then(r => r.json()).then((d: Exercise[]) => setAllExs(Array.isArray(d) ? d : [])).catch(() => {})
    fetch(`${API_BASE}/muscleworkout/all.php`)
      .then(r => r.json()).then((d: MuscleRotation[]) => setRotations(Array.isArray(d) ? d : [])).catch(() => {})
  }, [])

  function fetchPlans() {
    setPlans(null)
    fetch(`${API_BASE}/t_workoutmaintype/getAll.php`)
      .then(r => r.json()).then((d: WorkoutPlan[]) => setPlans(Array.isArray(d) ? d : [])).catch(() => setPlans([]))
  }

  function fetchPlanExercises(planId: string) {
    setLoadingExs(true); setPlanExercises(null)
    fetch(`${API_BASE}/t_workoutsubtype/getAllByMainTypeId.php?mtid=${planId}`)
      .then(r => r.json())
      .then((d: Exercise[]) => setPlanExercises(Array.isArray(d) ? d.filter(e => e.discontinue !== 'true') : []))
      .catch(() => setPlanExercises([]))
      .finally(() => setLoadingExs(false))
  }

  function openPlan(plan: WorkoutPlan) { setSelectedPlan(plan); setShowRotation(isRotationPlan(plan.name)); fetchPlanExercises(plan.id); setMobilePane('detail') }

  function refreshAllExs() {
    fetch(`${API_BASE}/t_workoutsubtype/getAll.php`)
      .then(r => r.json()).then((d: Exercise[]) => setAllExs(Array.isArray(d) ? d : [])).catch(() => {})
  }

  function fetchRotations() {
    fetch(`${API_BASE}/muscleworkout/all.php`)
      .then(r => r.json()).then((d: MuscleRotation[]) => setRotations(Array.isArray(d) ? d : [])).catch(() => {})
  }

  async function handleCreateRotation(data: Omit<MuscleRotation, 'id'>) {
    setSaving(true)
    try {
      await fetch(`${API_BASE}/muscleworkout/create.php`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      setAddingRotation(false)
      fetchRotations()
    } finally { setSaving(false) }
  }

  async function handleUpdateRotation(data: Omit<MuscleRotation, 'id'>) {
    if (!editingRotation) return
    setSaving(true)
    try {
      await fetch(`${API_BASE}/muscleworkout/update.php`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, id: editingRotation.id }),
      })
      setEditingRotation(null)
      fetchRotations()
    } finally { setSaving(false) }
  }

  async function handleDeleteRotation() {
    if (!deletingRotation) return
    setSaving(true)
    try {
      await fetch(`${API_BASE}/muscleworkout/delete.php`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: deletingRotation.id }),
      })
      setDeletingRotation(null)
      fetchRotations()
    } finally { setSaving(false) }
  }

  const exCountByPlan = useMemo(() => {
    const map: Record<string, number> = {}
    allExs.forEach(e => { map[e.mtid] = (map[e.mtid] ?? 0) + 1 })
    return map
  }, [allExs])

  const filteredPlans = useMemo(() => {
    if (!plans) return null
    if (!planSearch.trim()) return plans
    return plans.filter(p => p.name.toLowerCase().includes(planSearch.toLowerCase()))
  }, [plans, planSearch])

  const planRotations = useMemo(() => {
    if (!selectedPlan) return []
    return rotations.filter(r => r.mainWorkoutName === selectedPlan.name)
      .sort((a, b) => DAY_ORDER.indexOf(a.day) - DAY_ORDER.indexOf(b.day))
  }, [rotations, selectedPlan])

  // ── CRUD ──────────────────────────────────────────────────────────────────
  async function handleCreatePlan(name: string, exercises: PickedEx[], dayPlanSelection?: Record<string, string>) {
    setSaving(true)
    try {
      const res  = await fetch(`${API_BASE}/t_workoutmaintype/create.php`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, discontinue: 'false' }),
      })
      const json = await res.json()

      let planId: string | null = null
      if (json && typeof json === 'object' && json.id) {
        planId = String(json.id)
      } else {
        const all: WorkoutPlan[] = await fetch(`${API_BASE}/t_workoutmaintype/getAll.php`).then(r => r.json())
        const matches = (Array.isArray(all) ? all : []).filter(p => p.name === name)
        if (matches.length > 0) planId = String(Math.max(...matches.map(p => parseInt(p.id))))
      }

      if (planId && exercises.length > 0) {
        await Promise.all(exercises.map(ex =>
          fetch(`${API_BASE}/t_workoutsubtype/create.php`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...ex, mtid: planId, discontinue: 'false', id: 0 }),
          })
        ))
      }

      // For rotation plans: create a sub-plan per day and copy exercises from the selected source plan
      if (dayPlanSelection) {
        for (const day of DAY_ORDER) {
          const srcPlanId = dayPlanSelection[day]
          if (!srcPlanId) continue
          const subPlanName = `${name} - ${day}`
          const subRes  = await fetch(`${API_BASE}/t_workoutmaintype/create.php`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: subPlanName, discontinue: 'false' }),
          })
          const subJson = await subRes.json()
          let subPlanId: string | null = null
          if (subJson && typeof subJson === 'object' && subJson.id) {
            subPlanId = String(subJson.id)
          } else {
            const all: WorkoutPlan[] = await fetch(`${API_BASE}/t_workoutmaintype/getAll.php`).then(r => r.json())
            const matches = (Array.isArray(all) ? all : []).filter(p => p.name === subPlanName)
            if (matches.length > 0) subPlanId = String(Math.max(...matches.map(p => parseInt(p.id))))
          }
          if (subPlanId) {
            const srcExs: Exercise[] = await fetch(`${API_BASE}/t_workoutsubtype/getAllByMainTypeId.php?mtid=${srcPlanId}`)
              .then(r => r.json()).catch(() => [])
            const activeExs = Array.isArray(srcExs) ? srcExs.filter(e => e.discontinue !== 'true') : []
            await Promise.all([
              ...activeExs.map(ex =>
                fetch(`${API_BASE}/t_workoutsubtype/create.php`, {
                  method: 'POST', headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ name: ex.name, gifFilePath: ex.gifFilePath, muscle: ex.muscle, sets: ex.sets, reps: ex.reps, mtid: subPlanId, discontinue: 'false', id: 0 }),
                })
              ),
              fetch(`${API_BASE}/muscleworkout/create.php`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ mainWorkoutName: name, day, subWorkoutName: subPlanName }),
              }),
            ])
          }
        }
      }

      setShowCreatePlan(false)
      fetchPlans()
      refreshAllExs()
      fetchRotations()
    } finally { setSaving(false) }
  }

  async function handleEditPlan(name: string) {
    if (!editingPlan) return
    setSaving(true)
    try {
      await fetch(`${API_BASE}/t_workoutmaintype/update.php`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: editingPlan.id, name, discontinue: editingPlan.discontinue }),
      })
      if (selectedPlan?.id === editingPlan.id) setSelectedPlan({ ...editingPlan, name })
      setEditingPlan(null); fetchPlans()
    } finally { setSaving(false) }
  }

  async function handleDisablePlan() {
    if (!disablingPlan) return
    setSaving(true)
    try {
      await fetch(`${API_BASE}/t_workoutmaintype/update.php`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: disablingPlan.id, name: disablingPlan.name, discontinue: 'true' }),
      })
      setDisablingPlan(null)
      if (selectedPlan?.id === disablingPlan.id) setSelectedPlan(null)
      fetchPlans()
    } finally { setSaving(false) }
  }

  async function handleCreateExercise(data: Omit<Exercise, 'id' | 'mtid' | 'discontinue'>) {
    if (!selectedPlan) return
    setSaving(true)
    try {
      await fetch(`${API_BASE}/t_workoutsubtype/create.php`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, mtid: selectedPlan.id, discontinue: 'false', id: 0 }),
      })
      setShowCreateEx(false); fetchPlanExercises(selectedPlan.id); refreshAllExs()
    } finally { setSaving(false) }
  }

  async function handleEditExercise(data: Omit<Exercise, 'id' | 'mtid' | 'discontinue'>) {
    if (!editingEx || !selectedPlan) return
    setSaving(true)
    try {
      await fetch(`${API_BASE}/t_workoutsubtype/update.php`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, id: editingEx.id, mtid: selectedPlan.id, discontinue: editingEx.discontinue }),
      })
      setEditingEx(null); fetchPlanExercises(selectedPlan.id)
    } finally { setSaving(false) }
  }

  async function handleDisableExercise() {
    if (!disablingEx || !selectedPlan) return
    setSaving(true)
    try {
      await fetch(`${API_BASE}/t_workoutsubtype/update.php`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: disablingEx.id, name: disablingEx.name, mtid: selectedPlan.id,
          muscle: disablingEx.muscle, sets: disablingEx.sets, reps: disablingEx.reps,
          gifFilePath: disablingEx.gifFilePath, discontinue: 'true',
        }),
      })
      setDisablingEx(null); fetchPlanExercises(selectedPlan.id); refreshAllExs()
    } finally { setSaving(false) }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#f9fafb' }}>

      {/* Header */}
      <header style={{ background: '#fff', borderBottom: '1px solid #e5e7eb', flexShrink: 0, position: 'sticky', top: 0, zIndex: 10 }}>
        <div style={{ padding: '0 16px', height: '56px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button onClick={() => navigate('/dashboard')}
            style={{ width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '10px', border: 'none', background: 'transparent', cursor: 'pointer', color: '#6b7280' }}>
            <svg style={{ width: '20px', height: '20px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <p style={{ fontWeight: 700, fontSize: '16px', color: '#111827', lineHeight: 1.2 }}>🏋️ Workout Plans</p>
            <p style={{ fontSize: '11px', color: '#9ca3af' }}>Manage workout plan templates</p>
          </div>
        </div>
      </header>

      {/* Two-panel body */}
      <div className="flex flex-1 overflow-hidden">

        {/* LEFT PANEL — plan list */}
        <div className={`${mobilePane === 'detail' ? 'hidden md:flex' : 'flex'} w-full md:w-[340px] flex-shrink-0 border-r border-gray-200 bg-white flex-col overflow-hidden`}>

          {/* Action buttons */}
          <div style={{ padding: '12px', borderBottom: '1px solid #f3f4f6', display: 'flex', gap: '8px', flexShrink: 0 }}>
            <button onClick={() => setShowCreatePlan(true)}
              style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '10px', borderRadius: '12px', border: 'none', backgroundColor: '#dc2626', color: '#fff', fontWeight: 700, fontSize: '13px', cursor: 'pointer' }}>
              <span style={{ fontSize: '16px', lineHeight: 1 }}>+</span>
              <span>Create Plan</span>
            </button>
            <button onClick={() => setShowSetup(true)}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '10px 14px', borderRadius: '12px', border: 'none', backgroundColor: '#1f2937', color: '#fff', fontWeight: 700, fontSize: '13px', cursor: 'pointer', flexShrink: 0 }}>
              <svg style={{ width: '14px', height: '14px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span>Setup</span>
            </button>
          </div>

          {/* Search bar */}
          <div style={{ padding: '10px 12px', borderBottom: '1px solid #f3f4f6', flexShrink: 0 }}>
            <div style={{ position: 'relative' }}>
              <svg style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', width: '14px', height: '14px', color: '#9ca3af', pointerEvents: 'none' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                value={planSearch}
                onChange={e => setPlanSearch(e.target.value)}
                placeholder="Search plans…"
                style={{ width: '100%', paddingLeft: '32px', paddingRight: planSearch ? '30px' : '10px', paddingTop: '8px', paddingBottom: '8px', border: '1px solid #e5e7eb', borderRadius: '10px', fontSize: '13px', outline: 'none', color: '#111827', boxSizing: 'border-box' }}
              />
              {planSearch && (
                <button onClick={() => setPlanSearch('')}
                  style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', padding: '2px', display: 'flex', alignItems: 'center' }}>
                  <svg style={{ width: '13px', height: '13px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          </div>

          {/* Plan list — scrollable */}
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {filteredPlans === null ? (
              <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {[1,2,3,4].map(i => <div key={i} style={{ height: '52px', borderRadius: '8px', background: '#f3f4f6', animation: 'pulse 1.5s infinite' }} />)}
              </div>
            ) : filteredPlans.length === 0 ? (
              <div style={{ padding: '40px 16px', textAlign: 'center', color: '#9ca3af' }}>
                <div style={{ fontSize: '32px', marginBottom: '8px' }}>🔍</div>
                <p style={{ fontSize: '12px' }}>{planSearch ? 'No plans match' : 'No plans yet'}</p>
              </div>
            ) : (
              filteredPlans.map(plan => {
                const isSelected = selectedPlan?.id === plan.id
                return (
                  <button key={plan.id} onClick={() => openPlan(plan)}
                    style={{
                      display: 'flex', alignItems: 'center', width: '100%', padding: '12px 16px',
                      textAlign: 'left', border: 'none', cursor: 'pointer', gap: '10px',
                      backgroundColor: isSelected ? '#fff1f2' : 'transparent',
                      borderLeft: `3px solid ${isSelected ? '#dc2626' : 'transparent'}`,
                      borderBottom: '1px solid #f9fafb',
                    }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontWeight: 600, fontSize: '13px', color: isSelected ? '#dc2626' : '#1f2937', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{plan.name}</p>
                      <p style={{ fontSize: '11px', color: '#9ca3af', marginTop: '2px' }}>
                        {exCountByPlan[plan.id] ?? 0} exercise{(exCountByPlan[plan.id] ?? 0) === 1 ? '' : 's'}
                        {isRotationPlan(plan.name) && <span style={{ marginLeft: '5px', backgroundColor: '#fef3c7', color: '#92400e', padding: '1px 5px', borderRadius: '999px', fontSize: '10px' }}>Rotation</span>}
                      </p>
                    </div>
                    <svg style={{ width: '14px', height: '14px', color: isSelected ? '#dc2626' : '#d1d5db', flexShrink: 0 }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                )
              })
            )}
          </div>
        </div>

        {/* RIGHT PANEL — exercise detail */}
        <div className={`${mobilePane === 'list' ? 'hidden md:block' : 'block'} flex-1 overflow-y-auto bg-gray-50`}>
          {/* Mobile back button */}
          <div className="md:hidden sticky top-0 z-10 bg-white border-b border-gray-100 px-4 py-2.5">
            <button onClick={() => setMobilePane('list')} className="flex items-center gap-1.5 text-sm font-medium text-gray-600">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              All Plans
            </button>
          </div>
          {!selectedPlan ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#9ca3af' }}>
              <div style={{ fontSize: '48px', marginBottom: '12px' }}>👈</div>
              <p style={{ fontWeight: 500, fontSize: '14px', color: '#6b7280' }}>Select a plan to view exercises</p>
            </div>
          ) : (
            <div style={{ padding: '20px' }}>

              {/* Right panel header: plan name + edit/disable actions */}
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '16px' }}>
                <div>
                  <h2 style={{ fontWeight: 700, fontSize: '18px', color: '#111827', lineHeight: 1.2 }}>{selectedPlan.name}</h2>
                  <p style={{ fontSize: '12px', color: '#9ca3af', marginTop: '3px' }}>
                    {loadingExs ? 'Loading…' : `${planExercises?.length ?? 0} exercise${planExercises?.length === 1 ? '' : 's'}`}
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                  <button onClick={() => setEditingPlan(selectedPlan)}
                    style={{ width: '34px', height: '34px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '10px', border: '1px solid #e5e7eb', background: '#fff', cursor: 'pointer', color: '#6b7280' }}>
                    <svg style={{ width: '15px', height: '15px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  <button onClick={() => setDisablingPlan(selectedPlan)}
                    style={{ width: '34px', height: '34px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '10px', border: '1px solid #fee2e2', background: '#fff', cursor: 'pointer', color: '#ef4444' }}>
                    <svg style={{ width: '15px', height: '15px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Rotation banner */}
              {isRotationPlan(selectedPlan.name) && (
                <div style={{ marginBottom: '16px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '14px', padding: '12px 16px', display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                  <span style={{ fontSize: '16px', marginTop: '1px' }}>🔄</span>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: '13px', fontWeight: 600, color: '#92400e' }}>Rotation Plan</p>
                    <p style={{ fontSize: '11px', color: '#b45309', marginTop: '2px' }}>Server auto-assigns exercises by day of week.</p>
                    <button onClick={() => setShowRotation(v => !v)}
                      style={{ fontSize: '11px', color: '#b45309', fontWeight: 700, marginTop: '6px', textDecoration: 'underline', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                      {showRotation ? 'Hide' : 'Manage'} day schedule
                    </button>
                    {showRotation && (
                      <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        {planRotations.length === 0 && (
                          <p style={{ fontSize: '11px', color: '#b45309', marginBottom: '4px' }}>No day assignments yet.</p>
                        )}
                        {planRotations.map(r => (
                          <div key={r.id} style={{ display: 'flex', alignItems: 'center', fontSize: '11px', background: '#fff', borderRadius: '8px', padding: '5px 10px', border: '1px solid #fde68a', gap: '6px' }}>
                            <span style={{ fontWeight: 700, color: '#374151', width: '76px', flexShrink: 0 }}>{r.day}</span>
                            <span style={{ color: '#6b7280', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.subWorkoutName}</span>
                            <button onClick={() => setEditingRotation(r)}
                              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#b45309', padding: '2px 4px', fontSize: '13px', flexShrink: 0, lineHeight: 1 }}>✏️</button>
                            <button onClick={() => setDeletingRotation(r)}
                              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', padding: '2px 4px', fontSize: '13px', flexShrink: 0, lineHeight: 1 }}>🗑</button>
                          </div>
                        ))}
                        <button onClick={() => setAddingRotation(true)}
                          style={{ fontSize: '11px', color: '#b45309', fontWeight: 700, marginTop: '4px', background: 'none', border: '1px dashed #fde68a', borderRadius: '8px', cursor: 'pointer', padding: '6px 10px', textAlign: 'left' }}>
                          + Add day assignment
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Add exercise button */}
              <button onClick={() => setShowCreateEx(true)}
                style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontWeight: 600, fontSize: '13px', padding: '10px', borderRadius: '14px', marginBottom: '16px', border: '2px dashed #d1d5db', color: '#6b7280', background: 'transparent', cursor: 'pointer' }}>
                <span style={{ fontSize: '16px', lineHeight: 1 }}>+</span>
                <span>Add Exercise to this Plan</span>
              </button>

              {/* Exercise list */}
              {loadingExs ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {[1,2,3].map(i => <div key={i} style={{ height: '68px', borderRadius: '14px', background: '#fff', animation: 'pulse 1.5s infinite' }} />)}
                </div>
              ) : planExercises?.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '48px 0', color: '#9ca3af' }}>
                  <div style={{ fontSize: '36px', marginBottom: '10px' }}>💪</div>
                  <p style={{ fontWeight: 500, fontSize: '13px', color: '#6b7280' }}>No exercises yet</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {planExercises?.map(ex => (
                    <div key={ex.id} style={{ background: '#fff', borderRadius: '14px', border: '1px solid #f3f4f6', padding: '10px 14px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ width: '52px', height: '52px', borderRadius: '10px', background: '#f3f4f6', flexShrink: 0, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {ex.gifFilePath ? (
                          <img src={gifUrl(ex.gifFilePath)} alt={ex.name}
                            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                            onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
                        ) : <span style={{ fontSize: '22px' }}>💪</span>}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontWeight: 600, fontSize: '13px', color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ex.name}</p>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px', flexWrap: 'wrap' }}>
                          {ex.muscle && (
                            <span style={{ fontSize: '10px', padding: '2px 7px', borderRadius: '999px', fontWeight: 600, textTransform: 'capitalize', backgroundColor: '#f3f4f6', color: '#4b5563' }}>{ex.muscle}</span>
                          )}
                          <span style={{ fontSize: '11px', color: '#9ca3af', backgroundColor: '#f9fafb', padding: '2px 7px', borderRadius: '999px' }}>{ex.sets}×{ex.reps}</span>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                        <button onClick={() => setEditingEx(ex)}
                          style={{ width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '8px', border: 'none', background: 'transparent', cursor: 'pointer', color: '#9ca3af' }}>
                          <svg style={{ width: '14px', height: '14px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button onClick={() => setDisablingEx(ex)}
                          style={{ width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '8px', border: 'none', background: 'transparent', cursor: 'pointer', color: '#ef4444' }}>
                          <svg style={{ width: '14px', height: '14px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* MODALS */}
      {showSetup && plans && (
        <SetupView plans={plans} allExs={allExs} onClose={() => setShowSetup(false)} onRefresh={refreshAllExs} />
      )}
      {showCreatePlan && (
        <CreatePlanWizard plans={plans ?? []} allExs={allExs} onSave={handleCreatePlan} onClose={() => setShowCreatePlan(false)} saving={saving} />
      )}
      {editingPlan && (
        <EditPlanSheet initial={editingPlan.name} onSave={handleEditPlan} onClose={() => setEditingPlan(null)} saving={saving} />
      )}
      {disablingPlan && (
        <ConfirmSheet title="Disable Plan"
          message={`Disable "${disablingPlan.name}"? Existing member schedules won't be affected.`}
          onConfirm={handleDisablePlan} onClose={() => setDisablingPlan(null)} loading={saving} />
      )}
      {showCreateEx && (
        <ExerciseForm initial={{}} onSave={handleCreateExercise} onClose={() => setShowCreateEx(false)} saving={saving} />
      )}
      {editingEx && (
        <ExerciseForm initial={editingEx} onSave={handleEditExercise} onClose={() => setEditingEx(null)} saving={saving} />
      )}
      {disablingEx && (
        <ConfirmSheet title="Remove Exercise"
          message={`Remove "${disablingEx.name}" from this plan?`}
          onConfirm={handleDisableExercise} onClose={() => setDisablingEx(null)} loading={saving} />
      )}
      {addingRotation && selectedPlan && (
        <MuscleRotationSheet
          initial={{}}
          plans={plans ?? []}
          mainWorkoutName={selectedPlan.name}
          onSave={handleCreateRotation}
          onClose={() => setAddingRotation(false)}
          saving={saving}
        />
      )}
      {editingRotation && selectedPlan && (
        <MuscleRotationSheet
          initial={editingRotation}
          plans={plans ?? []}
          mainWorkoutName={selectedPlan.name}
          onSave={handleUpdateRotation}
          onClose={() => setEditingRotation(null)}
          saving={saving}
        />
      )}
      {deletingRotation && (
        <ConfirmSheet
          title="Remove Day Assignment"
          message={`Remove the "${deletingRotation.day}" assignment (→ ${deletingRotation.subWorkoutName}) from this rotation?`}
          onConfirm={handleDeleteRotation}
          onClose={() => setDeletingRotation(null)}
          loading={saving}
        />
      )}
    </div>
  )
}
