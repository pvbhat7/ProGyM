import { useState, useEffect, useMemo } from 'react'
import type { ReactElement } from 'react'
import { useNavigate } from 'react-router-dom'
import { API_BASE, MEDIA_BASE } from '../api/config'

type Exercise = { name: string; gifFilePath: string; muscle: string }
type WorkoutType = { id: string; name: string; discontinue?: string }

const MUSCLE_SUFFIX_RE = /\s-\s(CHEST|BICEPS|TRICEPS|SHOULDER|BACK|LEGS)$/i
const DAY_SUFFIX_RE = /\s-\s(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)$/i

function isParentType(name: string): boolean {
  return !MUSCLE_SUFFIX_RE.test(name) && !DAY_SUFFIX_RE.test(name)
}

function muscleFromTypeName(name: string): string {
  const m = name.match(MUSCLE_SUFFIX_RE)
  return m ? m[1].toLowerCase() : ''
}

const PROGRAM_STYLE: Record<string, { gradient: string; short: string }> = {
  'Single Muscle - 1': { gradient: 'from-red-500    to-orange-500', short: 'S1' },
  'Single Muscle - 2': { gradient: 'from-orange-500 to-amber-500',  short: 'S2' },
  'Single Muscle - 3': { gradient: 'from-amber-500  to-yellow-500', short: 'S3' },
  'Double Muscle - 1': { gradient: 'from-blue-500   to-cyan-500',   short: 'D1' },
  'Double Muscle - 2': { gradient: 'from-cyan-500   to-teal-500',   short: 'D2' },
  'Double Muscle - 3': { gradient: 'from-teal-500   to-emerald-500', short: 'D3' },
  'Mixed Workout':     { gradient: 'from-violet-500 to-purple-500', short: 'MX' },
  'Mixed Workout 2':   { gradient: 'from-purple-500 to-fuchsia-500', short: 'M2' },
  'Ladies Level - 1':  { gradient: 'from-pink-500   to-rose-500',   short: 'L1' },
  'Ladies Level - 2':  { gradient: 'from-rose-500   to-red-400',    short: 'L2' },
  'Ladies Level - 3':  { gradient: 'from-fuchsia-500 to-pink-500',  short: 'L3' },
}

function programStyle(name: string) {
  return PROGRAM_STYLE[name] ?? { gradient: 'from-gray-500 to-gray-400', short: name.slice(0, 2).toUpperCase() }
}

const MUSCLE_CONFIG: Record<string, { gradient: string; label: string }> = {
  chest:     { gradient: 'from-red-500    to-orange-400',   label: 'Chest'     },
  shoulders: { gradient: 'from-blue-500   to-sky-400',      label: 'Shoulders' },
  biceps:    { gradient: 'from-green-500  to-emerald-400',  label: 'Biceps'    },
  triceps:   { gradient: 'from-violet-500 to-purple-400',   label: 'Triceps'   },
  back:      { gradient: 'from-amber-500  to-yellow-400',   label: 'Back'      },
  legs:      { gradient: 'from-teal-500   to-cyan-400',     label: 'Legs'      },
  abs:       { gradient: 'from-pink-500   to-rose-400',     label: 'Abs'       },
  calves:    { gradient: 'from-indigo-500 to-blue-400',     label: 'Calves'    },
  forearms:  { gradient: 'from-orange-500 to-amber-400',    label: 'Forearms'  },
  cardio:    { gradient: 'from-red-600    to-pink-500',     label: 'Cardio'    },
}

const DEFAULT_GRADIENT = 'from-gray-500 to-gray-400'

function muscleConfig(muscle: string) {
  return MUSCLE_CONFIG[muscle?.toLowerCase()] ?? { gradient: DEFAULT_GRADIENT, label: muscle }
}

function gifUrl(path: string): string {
  if (!path) return ''
  if (path.startsWith('http')) return path
  return MEDIA_BASE + (path.startsWith('/') ? path : '/' + path)
}

// Muscle SVG silhouettes (simple stylized front-body highlight per group)
const MUSCLE_ICONS: Record<string, ReactElement> = {
  chest: (
    <svg viewBox="0 0 48 48" className="w-8 h-8" fill="none">
      {/* torso ghost */}
      <path d="M16 9 Q10 11 10 20 L11 39 L37 39 L38 20 Q38 11 32 9 Q28 7 24 8 Q20 7 16 9Z" fill="white" fillOpacity="0.12"/>
      {/* left pec */}
      <path d="M11 16 Q10 26 18 28 Q22 28 23 23 L22 15 Q17 11 11 16Z" fill="white" fillOpacity="0.95"/>
      {/* right pec */}
      <path d="M37 16 Q38 26 30 28 Q26 28 25 23 L26 15 Q31 11 37 16Z" fill="white" fillOpacity="0.95"/>
      <line x1="24" y1="15" x2="24" y2="27" stroke="white" strokeWidth="0.8" strokeOpacity="0.35"/>
    </svg>
  ),
  shoulders: (
    <svg viewBox="0 0 48 48" className="w-8 h-8" fill="none">
      {/* torso ghost */}
      <rect x="18" y="16" width="12" height="24" rx="2" fill="white" fillOpacity="0.1"/>
      {/* left deltoid */}
      <path d="M18 16 Q12 14 8 18 Q5 22 7 28 Q9 33 14 32 Q18 31 18 26Z" fill="white" fillOpacity="0.95"/>
      {/* right deltoid */}
      <path d="M30 16 Q36 14 40 18 Q43 22 41 28 Q39 33 34 32 Q30 31 30 26Z" fill="white" fillOpacity="0.95"/>
      {/* trap hint */}
      <path d="M18 16 Q24 12 30 16" stroke="white" strokeWidth="2.5" strokeOpacity="0.5" strokeLinecap="round"/>
    </svg>
  ),
  biceps: (
    <svg viewBox="0 0 48 48" className="w-8 h-8" fill="none">
      {/* torso ghost */}
      <rect x="17" y="10" width="14" height="28" rx="2" fill="white" fillOpacity="0.1"/>
      {/* left bicep — front of upper arm with peak */}
      <path d="M15 14 Q9 16 9 24 Q9 32 13 36 Q16 38 17 34 Q13 26 15 18Z" fill="white" fillOpacity="0.95"/>
      {/* bicep peak bump */}
      <path d="M15 18 Q10 22 12 26 Q14 20 15 18Z" fill="white" fillOpacity="0.4"/>
      {/* right bicep */}
      <path d="M33 14 Q39 16 39 24 Q39 32 35 36 Q32 38 31 34 Q35 26 33 18Z" fill="white" fillOpacity="0.95"/>
      <path d="M33 18 Q38 22 36 26 Q34 20 33 18Z" fill="white" fillOpacity="0.4"/>
    </svg>
  ),
  triceps: (
    <svg viewBox="0 0 48 48" className="w-8 h-8" fill="none">
      {/* torso ghost */}
      <rect x="17" y="10" width="14" height="28" rx="2" fill="white" fillOpacity="0.1"/>
      {/* left tricep — back of arm, horseshoe shape */}
      <path d="M9 14 Q6 20 8 28 Q10 35 14 36 Q17 37 16 31 Q11 23 13 14Z" fill="white" fillOpacity="0.95"/>
      {/* horseshoe gap */}
      <path d="M13 30 Q15 34 16 31" stroke="white" strokeWidth="1" strokeOpacity="0.5"/>
      {/* right tricep */}
      <path d="M39 14 Q42 20 40 28 Q38 35 34 36 Q31 37 32 31 Q37 23 35 14Z" fill="white" fillOpacity="0.95"/>
      <path d="M35 30 Q33 34 32 31" stroke="white" strokeWidth="1" strokeOpacity="0.5"/>
    </svg>
  ),
  back: (
    <svg viewBox="0 0 48 48" className="w-8 h-8" fill="none">
      {/* trapezius top */}
      <path d="M13 9 Q24 6 35 9 L37 17 Q30 13 24 14 Q18 13 11 17Z" fill="white" fillOpacity="0.95"/>
      {/* left lat — V-taper */}
      <path d="M11 17 Q7 24 10 34 L18 38 L22 36 L20 20 Q16 15 11 17Z" fill="white" fillOpacity="0.95"/>
      {/* right lat */}
      <path d="M37 17 Q41 24 38 34 L30 38 L26 36 L28 20 Q32 15 37 17Z" fill="white" fillOpacity="0.95"/>
      {/* spine */}
      <line x1="24" y1="13" x2="24" y2="38" stroke="white" strokeWidth="1" strokeOpacity="0.3"/>
    </svg>
  ),
  legs: (
    <svg viewBox="0 0 48 48" className="w-8 h-8" fill="none">
      {/* left quad — teardrop sweep */}
      <path d="M12 8 Q8 10 8 20 L10 34 Q12 40 16 40 Q20 40 20 34 L18 12 Q17 7 12 8Z" fill="white" fillOpacity="0.95"/>
      {/* quad definition line left */}
      <path d="M14 12 Q11 22 13 32" stroke="white" strokeWidth="0.8" strokeOpacity="0.35"/>
      {/* right quad */}
      <path d="M36 8 Q40 10 40 20 L38 34 Q36 40 32 40 Q28 40 28 34 L30 12 Q31 7 36 8Z" fill="white" fillOpacity="0.95"/>
      <path d="M34 12 Q37 22 35 32" stroke="white" strokeWidth="0.8" strokeOpacity="0.35"/>
    </svg>
  ),
  abs: (
    <svg viewBox="0 0 48 48" className="w-8 h-8" fill="none">
      {/* torso outline */}
      <path d="M16 7 Q13 9 13 36 L35 36 Q35 9 32 7 Q28 5 24 6 Q20 5 16 7Z" fill="white" fillOpacity="0.12"/>
      {/* 6 ab blocks */}
      <rect x="17" y="10" width="6" height="6" rx="1.5" fill="white" fillOpacity="0.95"/>
      <rect x="25" y="10" width="6" height="6" rx="1.5" fill="white" fillOpacity="0.95"/>
      <rect x="17" y="19" width="6" height="6" rx="1.5" fill="white" fillOpacity="0.95"/>
      <rect x="25" y="19" width="6" height="6" rx="1.5" fill="white" fillOpacity="0.95"/>
      <rect x="17" y="28" width="6" height="6" rx="1.5" fill="white" fillOpacity="0.95"/>
      <rect x="25" y="28" width="6" height="6" rx="1.5" fill="white" fillOpacity="0.95"/>
      {/* linea alba */}
      <line x1="24" y1="10" x2="24" y2="34" stroke="white" strokeWidth="1" strokeOpacity="0.25"/>
    </svg>
  ),
  calves: (
    <svg viewBox="0 0 48 48" className="w-8 h-8" fill="none">
      {/* left leg ghost */}
      <rect x="10" y="5" width="10" height="10" rx="2" fill="white" fillOpacity="0.1"/>
      {/* left calf — diamond bulge */}
      <path d="M10 15 L11 22 Q14 32 12 42 L18 42 Q16 32 19 22 L20 15Z" fill="white" fillOpacity="0.15"/>
      <ellipse cx="15" cy="27" rx="5.5" ry="9" fill="white" fillOpacity="0.95"/>
      {/* right leg ghost */}
      <rect x="28" y="5" width="10" height="10" rx="2" fill="white" fillOpacity="0.1"/>
      {/* right calf */}
      <path d="M28 15 L29 22 Q32 32 30 42 L36 42 Q34 32 37 22 L38 15Z" fill="white" fillOpacity="0.15"/>
      <ellipse cx="33" cy="27" rx="5.5" ry="9" fill="white" fillOpacity="0.95"/>
    </svg>
  ),
  forearms: (
    <svg viewBox="0 0 48 48" className="w-8 h-8" fill="none">
      {/* left forearm — tapered tube with muscle definition */}
      <path d="M8 8 Q6 12 7 22 L9 36 Q11 42 14 40 Q17 38 16 32 L14 20 Q13 10 10 8 Q9 7 8 8Z" fill="white" fillOpacity="0.95"/>
      <path d="M10 12 Q8 20 10 30" stroke="white" strokeWidth="0.7" strokeOpacity="0.35"/>
      {/* right forearm */}
      <path d="M40 8 Q42 12 41 22 L39 36 Q37 42 34 40 Q31 38 32 32 L34 20 Q35 10 38 8 Q39 7 40 8Z" fill="white" fillOpacity="0.95"/>
      <path d="M38 12 Q40 20 38 30" stroke="white" strokeWidth="0.7" strokeOpacity="0.35"/>
    </svg>
  ),
  cardio: (
    <svg viewBox="0 0 48 48" className="w-8 h-8" fill="none">
      {/* heart */}
      <path d="M24 40 Q10 30 10 20 Q10 12 17 11 Q21 10 24 16 Q27 10 31 11 Q38 12 38 20 Q38 30 24 40Z" fill="white" fillOpacity="0.95"/>
      {/* ECG pulse across heart */}
      <path d="M10 22 L15 22 L18 16 L22 30 L26 18 L29 22 L38 22" stroke="white" strokeWidth="1.5" strokeOpacity="0.45" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
}

function MuscleIcon({ muscle }: { muscle: string }) {
  return MUSCLE_ICONS[muscle?.toLowerCase()] ?? (
    <svg viewBox="0 0 48 48" className="w-8 h-8" fill="none">
      <circle cx="24" cy="24" r="14" fill="white" opacity="0.9" />
    </svg>
  )
}

function ExerciseCard({ exercise }: { exercise: Exercise }) {
  const [imgFailed, setImgFailed] = useState(false)
  const url = gifUrl(exercise.gifFilePath)
  const cfg = muscleConfig(exercise.muscle)

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
      {/* Title above image — matches Android app layout */}
      <div className="px-3 pt-3 pb-1.5">
        <p className="font-semibold text-gray-800 text-sm leading-tight">{exercise.name}</p>
      </div>

      {/* Image / GIF */}
      <div className="relative aspect-video bg-gray-100 mx-2 mb-2 rounded-xl overflow-hidden flex-shrink-0">
        {url && !imgFailed ? (
          <img
            src={url}
            alt={exercise.name}
            className="w-full h-full object-cover"
            onError={() => setImgFailed(true)}
          />
        ) : (
          <div className={`w-full h-full bg-gradient-to-br ${cfg.gradient} flex flex-col items-center justify-center gap-1`}>
            <MuscleIcon muscle={exercise.muscle} />
            <span className="text-white/70 text-xs font-medium capitalize">{exercise.muscle}</span>
          </div>
        )}
      </div>
    </div>
  )
}

export default function WorkoutsPage() {
  const navigate = useNavigate()
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState(false)
  const [selectedMuscle, setSelected] = useState<string>('')

  const [allTypes, setAllTypes]           = useState<WorkoutType[]>([])
  const [selectedProgram, setProgram]     = useState<string>('')
  const [programExercises, setProgramEx]  = useState<Exercise[]>([])
  const [programLoading, setProgramLoad]  = useState(false)

  useEffect(() => {
    fetch(`${API_BASE}/t_workoutsubtype/getAllDistinct.php`)
      .then(r => r.json())
      .then(d => {
        const list: Exercise[] = Array.isArray(d)
          ? d.filter(e => e && e.name)
          : []
        setExercises(list)
        if (list.length > 0) {
          const first = list.find(e => e.muscle)?.muscle ?? ''
          setSelected(first)
        }
        setLoading(false)
      })
      .catch(() => { setError(true); setLoading(false) })
  }, [])

  useEffect(() => {
    fetch(`${API_BASE}/t_workoutmaintype/getAll.php`)
      .then(r => r.json())
      .then(d => {
        const list: WorkoutType[] = Array.isArray(d)
          ? d.filter((t: WorkoutType) => t && t.name && t.discontinue !== 'true')
          : []
        setAllTypes(list)
      })
      .catch(() => {})
  }, [])

  const programs = useMemo(
    () => allTypes.filter(t => isParentType(t.name)),
    [allTypes]
  )

  useEffect(() => {
    if (!selectedProgram) {
      setProgramEx([])
      return
    }
    const parent = allTypes.find(t => t.id === selectedProgram)
    if (!parent) return

    const related = allTypes.filter(t =>
      t.id === parent.id || t.name.startsWith(parent.name + ' - ')
    )

    setProgramLoad(true)
    Promise.all(
      related.map(t =>
        fetch(`${API_BASE}/t_workoutsubtype/getAllByMainTypeId.php?mtid=${t.id}`)
          .then(r => r.json())
          .then((rows: any[]) => {
            const inferred = muscleFromTypeName(t.name)
            return (Array.isArray(rows) ? rows : []).map(r => ({
              name: r.name,
              gifFilePath: r.gifFilePath,
              muscle: (r.muscle && r.muscle.trim()) || inferred,
            })) as Exercise[]
          })
          .catch(() => [] as Exercise[])
      )
    )
      .then(chunks => {
        const merged = chunks.flat().filter(e => e && e.name)
        const seen = new Set<string>()
        const unique = merged.filter(e => {
          const k = `${e.name}|${e.muscle}`
          if (seen.has(k)) return false
          seen.add(k)
          return true
        })
        setProgramEx(unique)
        setProgramLoad(false)
        if (unique.length > 0) {
          const firstMuscle = unique.find(e => e.muscle)?.muscle
          if (firstMuscle && !unique.some(e => e.muscle === selectedMuscle)) {
            setSelected(firstMuscle)
          }
        }
      })
      .catch(() => { setProgramLoad(false) })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProgram, allTypes])

  const sourceExercises = selectedProgram ? programExercises : exercises

  const muscles = useMemo(() =>
    [...new Set(sourceExercises.map(e => e.muscle).filter(Boolean))],
    [sourceExercises])

  const filtered = useMemo(() =>
    selectedMuscle
      ? sourceExercises.filter(e => e.muscle === selectedMuscle)
      : sourceExercises,
    [sourceExercises, selectedMuscle])

  const selectedProgramName = programs.find(p => p.id === selectedProgram)?.name ?? ''
  const listLoading = loading || programLoading

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-3">
          <div className="flex-1 min-w-0">
            <h1 className="font-bold text-gray-800 text-lg leading-tight">Workouts</h1>
            {!listLoading && (selectedMuscle || selectedProgramName) && (
              <p className="text-xs text-gray-400 capitalize truncate">
                {filtered.length} exercises
                {selectedMuscle ? ` · ${selectedMuscle}` : ''}
                {selectedProgramName ? ` · ${selectedProgramName}` : ''}
              </p>
            )}
          </div>
          <button onClick={() => navigate('/')} className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors shadow-sm text-sm font-medium">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            Home
          </button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto flex">
        {/* LEFT: muscle tabs + exercise grid */}
        <div className="flex-1 min-w-0">
          {/* Muscle category scroll */}
          <div className="bg-white border-b border-gray-100 sticky top-[57px] z-10">
            {listLoading ? (
              <div className="flex gap-3 px-4 py-3">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex-shrink-0 w-20 h-20 bg-gray-100 rounded-2xl animate-pulse" />
                ))}
              </div>
            ) : (
              <div className="overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
              <div className="flex gap-3 px-4 py-3 w-max mx-auto">
                {muscles.map(muscle => {
                  const cfg = muscleConfig(muscle)
                  const active = selectedMuscle === muscle
                  return (
                    <button
                      key={muscle}
                      onClick={() => setSelected(muscle)}
                      className={`flex-shrink-0 flex flex-col items-center gap-1.5 px-3 py-2.5 rounded-2xl border-2 transition-all ${
                        active
                          ? 'border-gray-800 bg-gray-900 shadow-md scale-105'
                          : 'border-transparent bg-gray-50 hover:bg-gray-100'
                      }`}
                    >
                      <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${cfg.gradient} flex items-center justify-center shadow-sm`}>
                        <MuscleIcon muscle={muscle} />
                      </div>
                      <span className={`text-xs font-semibold capitalize ${active ? 'text-white' : 'text-gray-600'}`}>
                        {cfg.label}
                      </span>
                    </button>
                  )
                })}
              </div>
              </div>
            )}
          </div>

          {/* Exercise grid */}
          <main className="px-4 py-4 pb-8">
            {listLoading && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden animate-pulse">
                    <div className="px-3 pt-3 pb-1.5">
                      <div className="h-4 bg-gray-200 rounded w-3/4" />
                    </div>
                    <div className="aspect-video mx-2 mb-2 bg-gray-100 rounded-xl" />
                  </div>
                ))}
              </div>
            )}

            {!listLoading && error && (
              <div className="text-center py-16 text-gray-400">
                <p className="text-5xl mb-3">😕</p>
                <p className="font-semibold text-gray-600">Could not load workouts</p>
              </div>
            )}

            {!listLoading && !error && filtered.length === 0 && (
              <div className="text-center py-16 text-gray-400">
                <p className="text-5xl mb-3">🏋️</p>
                <p className="font-semibold text-gray-600">No exercises found</p>
              </div>
            )}

            {!listLoading && !error && filtered.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {filtered.map((exercise, i) => (
                  <ExerciseCard key={`${exercise.name}-${i}`} exercise={exercise} />
                ))}
              </div>
            )}
          </main>
        </div>

        {/* RIGHT: workout program vertical menu */}
        <aside className="w-32 sm:w-44 md:w-52 flex-shrink-0 border-l border-gray-200 bg-white">
          <div className="sticky top-[57px] max-h-[calc(100vh-57px)] overflow-y-auto">
            <div className="px-3 py-3 border-b border-gray-100">
              <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Programs</p>
            </div>
            <div className="p-2 space-y-1.5">
              <button
                onClick={() => setProgram('')}
                className={`w-full flex items-center gap-2 px-2 py-2 rounded-xl border-2 transition-all text-left ${
                  !selectedProgram
                    ? 'border-gray-800 bg-gray-900 shadow-sm'
                    : 'border-transparent bg-gray-50 hover:bg-gray-100'
                }`}
              >
                <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-slate-500 to-gray-500 flex items-center justify-center flex-shrink-0">
                  <span className="text-white text-[10px] font-bold">ALL</span>
                </div>
                <span className={`text-xs font-semibold leading-tight ${!selectedProgram ? 'text-white' : 'text-gray-700'}`}>
                  All exercises
                </span>
              </button>

              {programs.map(p => {
                const style = programStyle(p.name)
                const active = selectedProgram === p.id
                return (
                  <button
                    key={p.id}
                    onClick={() => setProgram(p.id)}
                    className={`w-full flex items-center gap-2 px-2 py-2 rounded-xl border-2 transition-all text-left ${
                      active
                        ? 'border-gray-800 bg-gray-900 shadow-sm'
                        : 'border-transparent bg-gray-50 hover:bg-gray-100'
                    }`}
                  >
                    <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${style.gradient} flex items-center justify-center flex-shrink-0 shadow-sm`}>
                      <span className="text-white text-[10px] font-bold">{style.short}</span>
                    </div>
                    <span className={`text-xs font-semibold leading-tight ${active ? 'text-white' : 'text-gray-700'}`}>
                      {p.name}
                    </span>
                  </button>
                )
              })}

              {programs.length === 0 && !loading && (
                <div className="p-2 text-[11px] text-gray-400">No programs</div>
              )}
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}
