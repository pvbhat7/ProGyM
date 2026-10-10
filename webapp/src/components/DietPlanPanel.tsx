import { useEffect, useState } from 'react'
import { API_BASE } from '../api/config'
import { getIdTokenOrThrow } from '../firebase'

// AI Diet Plans for one member — used by the member profile "Diet" tab and /admin-diet-plans.
// Flow: member details form → AI drafts a one-day plan against calorie/protein targets computed
// on the server → admin reviews/edits → Save & assign. Saved plans are listed above the form.

export type Meal = { time: string; name: string; items: string[]; kcal: number; protein_g: number; alt: string }
type Targets = { kcal: number; protein_g: number; carbs_g: number; fat_g: number; water_l: number; bmr?: number; tdee?: number }
export type Plan = { title: string; summary: string; meals: Meal[]; tips: string[]; targets?: Targets }
type Inputs = {
  gender: string; age: string; height_cm: string; weight_kg: string
  goal: string; diet_type: string; activity: string; budget: string; meals: string
  wake_time: string; workout_time: string; sleep_time: string; supplements: boolean
  avoid: string; medical: string; notes: string
}
type Member = { id: number; name: string; gender: string; age: number | null; height_cm: number | null; weight_kg: number | null; last_inputs: Partial<Inputs> | null }
type SavedPlan = { id: number; title: string; status: string; created_at: string; plan: Plan; inputs: Partial<Inputs> | null }

const GOALS: [string, string, string][] = [['fat_loss', '🔥', 'Fat loss'], ['muscle_gain', '💪', 'Muscle gain'], ['recomp', '🔄', 'Lose fat + build muscle'], ['maintain', '⚖️', 'Maintain']]
const DIETS: [string, string, string][] = [['veg', '🥦', 'Veg'], ['eggetarian', '🥚', 'Veg + Egg'], ['nonveg', '🍗', 'Non-veg'], ['vegan', '🌱', 'Vegan']]
const ACTIVITY = [['sedentary', 'Desk job, gym only'], ['light', 'Lightly active'], ['moderate', 'Moderately active'], ['active', 'Very active / physical job']]
const BUDGET = [['low', '💰 Low'], ['medium', '💰💰 Medium'], ['high', '💰💰💰 High']]
const LOADING_STEPS = ['Calculating calories & protein…', 'Picking Maharashtrian home foods…', 'Timing meals around the workout…', 'Balancing portions…', 'Writing tips…']

const EMPTY: Inputs = {
  gender: '', age: '', height_cm: '', weight_kg: '', goal: 'fat_loss', diet_type: 'veg', activity: 'moderate', budget: 'medium',
  meals: '5', wake_time: '06:00', workout_time: '07:00', sleep_time: '22:30', supplements: false, avoid: '', medical: '', notes: '',
}

async function call<T>(path: string, body?: unknown): Promise<T> {
  const token = await getIdTokenOrThrow('AI Diet Plans')
  const r = await fetch(`${API_BASE}/aidiet/${path}`, {
    method: body === undefined ? 'GET' : 'POST',
    headers: { Authorization: `Bearer ${token}`, ...(body === undefined ? {} : { 'Content-Type': 'application/json' }) },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  const d = await r.json().catch(() => ({ error: 'Server did not respond. Please try again.' }))
  if (!r.ok || d.error) throw new Error(d.error || 'Something went wrong.')
  return d as T
}

const sum = (meals: Meal[], k: 'kcal' | 'protein_g') => meals.reduce((s, m) => s + (Number(m[k]) || 0), 0)
const dmy = (s: string) => s.slice(0, 10).split('-').reverse().join('/')
const label = (list: [string, string, string][], v?: string) => { const f = list.find(x => x[0] === v); return f ? `${f[1]} ${f[2]}` : '' }

/** Icon + colour for a meal, from its name (falls back to time of day). */
function mealStyle(m: Meal) {
  const n = m.name.toLowerCase()
  const h = parseInt(m.time) || 12
  if (n.includes('pre')) return { icon: '⚡', dot: 'bg-amber-400', ring: 'ring-amber-100', chip: 'bg-amber-50 text-amber-700' }
  if (n.includes('post')) return { icon: '🏋️', dot: 'bg-rose-500', ring: 'ring-rose-100', chip: 'bg-rose-50 text-rose-700' }
  if (n.includes('breakfast')) return { icon: '🌅', dot: 'bg-orange-400', ring: 'ring-orange-100', chip: 'bg-orange-50 text-orange-700' }
  if (n.includes('lunch')) return { icon: '🍛', dot: 'bg-yellow-500', ring: 'ring-yellow-100', chip: 'bg-yellow-50 text-yellow-700' }
  if (n.includes('dinner')) return { icon: '🌙', dot: 'bg-indigo-500', ring: 'ring-indigo-100', chip: 'bg-indigo-50 text-indigo-700' }
  if (n.includes('bed') || h >= 21) return { icon: '🥛', dot: 'bg-violet-400', ring: 'ring-violet-100', chip: 'bg-violet-50 text-violet-700' }
  if (n.includes('wake') || h < 7) return { icon: '☀️', dot: 'bg-sky-400', ring: 'ring-sky-100', chip: 'bg-sky-50 text-sky-700' }
  return { icon: '🍎', dot: 'bg-emerald-500', ring: 'ring-emerald-100', chip: 'bg-emerald-50 text-emerald-700' }
}

// ── Display pieces ────────────────────────────────────────────────────────

function MacroCards({ plan }: { plan: Plan }) {
  const t = plan.targets
  if (!t) return null
  const kcal = sum(plan.meals, 'kcal'), prot = sum(plan.meals, 'protein_g')
  const card = (icon: string, name: string, value: string, sub: string, pct: number | null, color: string, ok = true) => (
    <div className="rounded-2xl bg-white border border-gray-100 shadow-sm px-3 py-2.5">
      <div className="flex items-center gap-1.5 text-[11px] font-semibold text-gray-500"><span className="text-base">{icon}</span>{name}</div>
      <p className="text-lg font-extrabold text-gray-900 leading-tight mt-0.5">{value}</p>
      <p className={`text-[10px] ${ok ? 'text-gray-400' : 'text-amber-600 font-semibold'}`}>{sub}</p>
      {pct !== null && (
        <div className="h-1.5 rounded-full bg-gray-100 mt-1.5 overflow-hidden">
          <div className={`h-full rounded-full ${ok ? color : 'bg-amber-400'}`} style={{ width: `${Math.min(100, pct)}%` }} />
        </div>
      )}
    </div>
  )
  const okK = Math.abs(kcal - t.kcal) <= t.kcal * 0.07
  const okP = Math.abs(prot - t.protein_g) <= t.protein_g * 0.12
  return (
    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
      {card('🔥', 'Calories', `${kcal}`, `target ${t.kcal} kcal${okK ? '' : ' — check portions'}`, (kcal / t.kcal) * 100, 'bg-orange-500', okK)}
      {card('💪', 'Protein', `${prot} g`, `target ${t.protein_g} g${okP ? '' : ' — check portions'}`, (prot / t.protein_g) * 100, 'bg-rose-500', okP)}
      {card('🌾', 'Carbs', `${t.carbs_g} g`, 'daily target', null, '')}
      {card('🥑', 'Fat', `${t.fat_g} g`, 'daily target', null, '')}
      {card('💧', 'Water', `${t.water_l} L`, 'per day', null, '')}
    </div>
  )
}

function PlanHero({ plan, inputs, badge }: { plan: Plan; inputs?: Partial<Inputs> | null; badge?: React.ReactNode }) {
  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-700 text-white p-5 shadow-md">
      <div className="absolute -right-6 -top-6 text-[110px] opacity-15 select-none">🥗</div>
      <div className="relative">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[10px] font-bold uppercase tracking-widest bg-white/20 rounded-full px-2.5 py-1">✨ AI Diet Plan</span>
          {badge}
        </div>
        <h2 className="text-xl sm:text-2xl font-extrabold mt-2 leading-tight">{plan.title}</h2>
        {plan.summary && <p className="text-sm text-emerald-50/90 mt-1.5 max-w-xl">{plan.summary}</p>}
        {inputs && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {[label(GOALS, inputs.goal), label(DIETS, inputs.diet_type),
              inputs.weight_kg ? `⚖️ ${inputs.weight_kg} kg` : '', inputs.meals ? `🍽️ ${inputs.meals} meals` : '',
              inputs.workout_time ? `🏋️ Workout ${inputs.workout_time}` : '', inputs.supplements ? '🥤 Whey' : '']
              .filter(Boolean).map(c => <span key={c} className="text-[11px] font-semibold bg-white/15 border border-white/20 rounded-full px-2.5 py-0.5">{c}</span>)}
          </div>
        )}
      </div>
    </div>
  )
}

function MealTimeline({ meals }: { meals: Meal[] }) {
  return (
    <div className="relative pl-6">
      <div className="absolute left-[9px] top-3 bottom-3 w-0.5 bg-gradient-to-b from-orange-200 via-emerald-200 to-indigo-200" />
      <div className="space-y-3">
        {meals.map((m, i) => {
          const s = mealStyle(m)
          return (
            <div key={i} className="relative">
              <span className={`absolute -left-6 top-3.5 w-5 h-5 rounded-full ${s.dot} ring-4 ${s.ring} border-2 border-white`} />
              <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-3.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <span className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-xl">{s.icon}</span>
                    <div>
                      <p className="font-bold text-gray-900 leading-tight">{m.name}</p>
                      <p className="text-xs text-gray-400 font-medium">🕒 {m.time || '—'}</p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <span className="text-[11px] font-bold bg-orange-50 text-orange-700 rounded-full px-2 py-0.5">🔥 {m.kcal} kcal</span>
                    <span className="text-[11px] font-bold bg-rose-50 text-rose-700 rounded-full px-2 py-0.5">💪 {m.protein_g} g</span>
                  </div>
                </div>
                <ul className="mt-2.5 space-y-1">
                  {m.items.map((it, j) => (
                    <li key={j} className="flex items-start gap-2 text-sm text-gray-700">
                      <span className="text-emerald-500 mt-0.5">✓</span><span>{it}</span>
                    </li>
                  ))}
                </ul>
                {m.alt && (
                  <div className={`mt-2.5 text-xs rounded-xl px-3 py-2 ${s.chip}`}>
                    <span className="font-bold">🔄 Swap option:</span> {m.alt}
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function Tips({ tips }: { tips: string[] }) {
  const icons = ['💧', '😴', '🧂', '📅', '🚶', '🍽️', '⭐', '✅']
  if (!tips.filter(t => t.trim()).length) return null
  return (
    <div className="rounded-2xl bg-gradient-to-br from-amber-50 to-yellow-50 border border-amber-100 p-4">
      <p className="text-sm font-bold text-amber-800 mb-2">💡 Coach's tips</p>
      <div className="grid sm:grid-cols-2 gap-2">
        {tips.filter(t => t.trim()).map((t, i) => (
          <div key={i} className="flex gap-2 bg-white/70 rounded-xl px-3 py-2 text-xs text-gray-700">
            <span className="text-base leading-none">{icons[i % icons.length]}</span><span>{t}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export function PlanView({ plan, inputs, badge }: { plan: Plan; inputs?: Partial<Inputs> | null; badge?: React.ReactNode }) {
  return (
    <div className="space-y-4">
      <PlanHero plan={plan} inputs={inputs} badge={badge} />
      <MacroCards plan={plan} />
      <MealTimeline meals={plan.meals} />
      <Tips tips={plan.tips} />
      <p className="text-[10px] text-gray-400 text-center">Calories &amp; protein per meal are estimates. Created with AI and reviewed by Pro Gym.</p>
    </div>
  )
}

function GeneratingCard() {
  const [step, setStep] = useState(0)
  useEffect(() => { const t = setInterval(() => setStep(s => (s + 1) % LOADING_STEPS.length), 2200); return () => clearInterval(t) }, [])
  return (
    <div className="rounded-3xl overflow-hidden border border-emerald-100 bg-white shadow-sm">
      <div className="bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-700 text-white p-6 text-center">
        <div className="text-5xl animate-bounce">🥗</div>
        <p className="font-extrabold text-lg mt-2">Creating the diet plan…</p>
        <p className="text-sm text-emerald-50/90 mt-1 h-5 transition-all">{LOADING_STEPS[step]}</p>
        <div className="flex justify-center gap-1.5 mt-3">
          {LOADING_STEPS.map((_, i) => <span key={i} className={`h-1.5 rounded-full transition-all ${i === step ? 'w-6 bg-white' : 'w-1.5 bg-white/40'}`} />)}
        </div>
      </div>
      <div className="p-4 space-y-3 animate-pulse">
        {[0, 1, 2].map(i => (
          <div key={i} className="flex gap-3">
            <div className="w-10 h-10 rounded-xl bg-gray-100" />
            <div className="flex-1 space-y-2"><div className="h-3 bg-gray-100 rounded w-1/3" /><div className="h-3 bg-gray-100 rounded w-2/3" /></div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Form pieces ───────────────────────────────────────────────────────────

function Choice({ active, onClick, icon, text }: { active: boolean; onClick: () => void; icon: string; text: string }) {
  return (
    <button type="button" onClick={onClick}
      className={`flex items-center gap-2 px-3 py-2.5 rounded-2xl border-2 text-sm font-semibold transition-all ${active ? 'border-emerald-500 bg-emerald-50 text-emerald-800 shadow-sm' : 'border-gray-100 bg-white text-gray-600 hover:border-emerald-200'}`}>
      <span className="text-lg">{icon}</span>{text}
    </button>
  )
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="block text-[11px] font-semibold text-gray-500 mb-1">{label}</span>{children}</label>
}
function Section({ icon, title, children }: { icon: string; title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-gray-400"><span className="text-base">{icon}</span>{title}</p>
      {children}
    </div>
  )
}
const inputCls = 'w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100'

// ── Main panel ────────────────────────────────────────────────────────────

export default function DietPlanPanel({ memberId }: { memberId: number }) {
  const [member, setMember] = useState<Member | null>(null)
  const [plans, setPlans] = useState<SavedPlan[]>([])
  const [inputs, setInputs] = useState<Inputs>(EMPTY)
  const [draft, setDraft] = useState<Plan | null>(null)
  const [model, setModel] = useState('')
  const [busy, setBusy] = useState<'' | 'load' | 'gen' | 'save'>('load')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [openPlan, setOpenPlan] = useState<number | null>(null)
  const [showForm, setShowForm] = useState(false)

  const set = <K extends keyof Inputs>(k: K, v: Inputs[K]) => setInputs(p => ({ ...p, [k]: v }))

  useEffect(() => {
    setBusy('load'); setError(''); setDraft(null); setNotice('')
    call<{ member: Member; plans: SavedPlan[] }>(`member.php?id=${memberId}`)
      .then(d => {
        setMember(d.member); setPlans(d.plans)
        setOpenPlan(d.plans.find(p => p.status === 'active')?.id ?? null)
        setShowForm(d.plans.length === 0)
        const li = d.member.last_inputs || {}
        const str = (v: unknown) => (v === null || v === undefined ? '' : String(v))
        setInputs({
          ...EMPTY, ...Object.fromEntries(Object.entries(li).map(([k, v]) => [k, typeof v === 'boolean' ? v : str(v)])),
          gender: d.member.gender || str(li.gender),
          age: str(d.member.age ?? li.age),
          height_cm: str(d.member.height_cm ?? li.height_cm),
          weight_kg: str(d.member.weight_kg ?? li.weight_kg),
        } as Inputs)
      })
      .catch(e => setError(e.message))
      .finally(() => setBusy(''))
  }, [memberId])

  async function generate() {
    if (!member) return
    setBusy('gen'); setError(''); setNotice('')
    try {
      const d = await call<{ plan: Plan; model: string }>('generate.php', { clientId: member.id, inputs })
      setDraft(d.plan); setModel(d.model)
    } catch (e) { setError(e instanceof Error ? e.message : 'Failed') }
    finally { setBusy('') }
  }

  async function save() {
    if (!member || !draft) return
    setBusy('save'); setError('')
    try {
      await call<{ id: number }>('save.php', { clientId: member.id, plan: draft, inputs, model })
      const d = await call<{ member: Member; plans: SavedPlan[] }>(`member.php?id=${member.id}`)
      setPlans(d.plans); setOpenPlan(d.plans[0]?.id ?? null); setDraft(null); setShowForm(false)
      setNotice(`Saved and assigned to ${member.name}.`)
    } catch (e) { setError(e instanceof Error ? e.message : 'Failed') }
    finally { setBusy('') }
  }

  async function remove(id: number) {
    if (!confirm('Delete this diet plan?')) return
    try {
      await call('delete.php', { id })
      setPlans(p => p.filter(x => x.id !== id))
    } catch (e) { setError(e instanceof Error ? e.message : 'Failed') }
  }

  const editMeal = (i: number, patch: Partial<Meal>) =>
    setDraft(d => d && { ...d, meals: d.meals.map((m, j) => (j === i ? { ...m, ...patch } : m)) })

  if (busy === 'load') return <div className="py-10 text-center text-sm text-gray-400">Loading diet plans…</div>

  return (
    <div className="space-y-4">
      {error && <div className="rounded-2xl bg-red-50 border border-red-100 text-red-700 text-sm px-4 py-3">⚠️ {error}</div>}
      {notice && <div className="rounded-2xl bg-emerald-50 border border-emerald-100 text-emerald-700 text-sm px-4 py-3 font-semibold">✅ {notice}</div>}
      {!member ? null : busy === 'gen' ? <GeneratingCard /> : draft ? (

        // ── Review & edit draft ──
        <div className="space-y-4">
          <div className="flex items-center justify-between rounded-2xl bg-amber-50 border border-amber-200 px-4 py-2.5">
            <p className="text-sm font-bold text-amber-800">✏️ Review &amp; edit before saving</p>
            <span className="text-[10px] font-bold bg-amber-200/70 text-amber-900 rounded-full px-2 py-0.5">DRAFT</span>
          </div>

          <div className="rounded-3xl bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-700 p-4 space-y-2 shadow-md">
            <input value={draft.title} onChange={e => setDraft({ ...draft, title: e.target.value })}
              className="w-full bg-white/15 border border-white/25 rounded-xl px-3 py-2 text-white font-extrabold text-lg placeholder-white/60 outline-none focus:bg-white/20" />
            <textarea value={draft.summary} rows={2} onChange={e => setDraft({ ...draft, summary: e.target.value })}
              className="w-full bg-white/10 border border-white/20 rounded-xl px-3 py-2 text-sm text-emerald-50 outline-none focus:bg-white/20" />
          </div>
          <MacroCards plan={draft} />

          <div className="space-y-3">
            {draft.meals.map((m, i) => {
              const s = mealStyle(m)
              return (
                <div key={i} className="rounded-2xl bg-white border border-gray-100 shadow-sm p-3.5 space-y-2">
                  <div className="flex gap-2 items-center">
                    <span className="w-10 h-10 shrink-0 rounded-xl bg-gray-50 flex items-center justify-center text-xl">{s.icon}</span>
                    <input value={m.name} onChange={e => editMeal(i, { name: e.target.value })} className={`${inputCls} font-bold`} />
                    <input type="time" value={m.time} onChange={e => editMeal(i, { time: e.target.value })} className={`${inputCls} w-28 shrink-0`} />
                    <button onClick={() => setDraft({ ...draft, meals: draft.meals.filter((_, j) => j !== i) })} title="Remove meal"
                      className="shrink-0 w-9 h-9 rounded-xl text-red-400 hover:bg-red-50">🗑️</button>
                  </div>
                  <textarea value={m.items.join('\n')} rows={Math.max(2, m.items.length)} placeholder="One food item per line"
                    onChange={e => editMeal(i, { items: e.target.value.split('\n') })} className={inputCls} />
                  <div className="flex flex-wrap gap-2 items-center text-xs font-semibold">
                    <span className="flex items-center gap-1 bg-orange-50 text-orange-700 rounded-xl pl-2 pr-1 py-1">🔥
                      <input type="number" value={m.kcal} onChange={e => editMeal(i, { kcal: Number(e.target.value) })} className="w-16 bg-white rounded-lg px-1.5 py-0.5 outline-none" /> kcal</span>
                    <span className="flex items-center gap-1 bg-rose-50 text-rose-700 rounded-xl pl-2 pr-1 py-1">💪
                      <input type="number" value={m.protein_g} onChange={e => editMeal(i, { protein_g: Number(e.target.value) })} className="w-14 bg-white rounded-lg px-1.5 py-0.5 outline-none" /> g protein</span>
                  </div>
                  <input value={m.alt} onChange={e => editMeal(i, { alt: e.target.value })} placeholder="🔄 Swap option" className={`${inputCls} text-xs`} />
                </div>
              )
            })}
            <button onClick={() => setDraft({ ...draft, meals: [...draft.meals, { time: '', name: 'Snack', items: [''], kcal: 0, protein_g: 0, alt: '' }] })}
              className="w-full py-2.5 rounded-2xl border-2 border-dashed border-emerald-200 text-sm font-semibold text-emerald-700 hover:bg-emerald-50">＋ Add meal</button>
          </div>

          <div className="rounded-2xl bg-amber-50 border border-amber-100 p-3">
            <p className="text-xs font-bold text-amber-800 mb-1.5">💡 Tips (one per line)</p>
            <textarea value={draft.tips.join('\n')} rows={4} onChange={e => setDraft({ ...draft, tips: e.target.value.split('\n') })} className={inputCls} />
          </div>

          <div className="sticky bottom-3 flex gap-2 bg-white/90 backdrop-blur rounded-2xl border border-gray-100 shadow-lg p-2">
            <button onClick={() => setDraft(null)} disabled={!!busy} className="px-4 py-2.5 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-100">← Back</button>
            <button onClick={generate} disabled={!!busy} className="px-4 py-2.5 rounded-xl border border-emerald-200 text-sm font-semibold text-emerald-700 hover:bg-emerald-50 disabled:opacity-50">↻ Regenerate</button>
            <button onClick={save} disabled={!!busy}
              className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white text-sm font-bold shadow disabled:opacity-50">
              {busy === 'save' ? 'Saving…' : `✅ Save & assign to ${member.name.split(' ')[0]}`}
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* ── Saved plans ── */}
          {plans.map(p => (
            <div key={p.id}>
              {openPlan === p.id ? (
                <div className="space-y-2">
                  <PlanView plan={p.plan} inputs={p.inputs}
                    badge={p.status === 'active'
                      ? <span className="text-[10px] font-bold uppercase tracking-widest bg-white text-emerald-700 rounded-full px-2.5 py-1">● Active · {dmy(p.created_at)}</span>
                      : <span className="text-[10px] font-bold uppercase tracking-widest bg-black/20 rounded-full px-2.5 py-1">Old · {dmy(p.created_at)}</span>} />
                  <div className="flex justify-center gap-2">
                    <button onClick={() => { setDraft({ ...p.plan }); setModel('edited') }} className="px-3 py-1.5 rounded-xl text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100">✏️ Edit as new</button>
                    <button onClick={() => setOpenPlan(null)} className="px-3 py-1.5 rounded-xl text-xs font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200">Collapse</button>
                    <button onClick={() => remove(p.id)} className="px-3 py-1.5 rounded-xl text-xs font-semibold text-red-600 bg-red-50 hover:bg-red-100">🗑️ Delete</button>
                  </div>
                </div>
              ) : (
                <button onClick={() => setOpenPlan(p.id)}
                  className="w-full flex items-center gap-3 rounded-2xl bg-white border border-gray-100 shadow-sm px-4 py-3 text-left hover:border-emerald-200">
                  <span className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl ${p.status === 'active' ? 'bg-emerald-50' : 'bg-gray-50 grayscale'}`}>🥗</span>
                  <span className="flex-1">
                    <span className="block text-sm font-bold text-gray-800">{p.title}</span>
                    <span className="block text-[11px] text-gray-400">{p.plan.targets ? `${p.plan.targets.kcal} kcal · ${p.plan.targets.protein_g} g protein · ` : ''}{dmy(p.created_at)}</span>
                  </span>
                  <span className={`text-[10px] font-bold rounded-full px-2 py-0.5 ${p.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>{p.status === 'active' ? 'ACTIVE' : 'OLD'}</span>
                </button>
              )}
            </div>
          ))}

          {/* ── Create form ── */}
          {!showForm ? (
            <button onClick={() => setShowForm(true)}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-bold text-sm shadow-md">
              ✨ Create a new AI diet plan
            </button>
          ) : (
            <div className="rounded-3xl bg-white border border-gray-100 shadow-sm overflow-hidden">
              <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border-b border-emerald-100 px-5 py-4 flex items-center gap-3">
                <span className="w-11 h-11 rounded-2xl bg-white shadow-sm flex items-center justify-center text-2xl">✨</span>
                <div>
                  <p className="font-extrabold text-gray-900">AI Diet Plan for {member.name}</p>
                  <p className="text-xs text-gray-500">Fill the details — AI builds a full day of Indian meals in seconds</p>
                </div>
              </div>

              <div className="p-5 space-y-6">
                <Section icon="🧍" title="Body details">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <Field label="Gender">
                      <select value={inputs.gender} onChange={e => set('gender', e.target.value)} className={inputCls}>
                        <option value="">—</option><option value="male">Male</option><option value="female">Female</option>
                      </select>
                    </Field>
                    <Field label="Age"><input type="number" inputMode="numeric" value={inputs.age} onChange={e => set('age', e.target.value)} className={inputCls} /></Field>
                    <Field label="Height (cm)"><input type="number" inputMode="decimal" value={inputs.height_cm} onChange={e => set('height_cm', e.target.value)} className={inputCls} /></Field>
                    <Field label="Weight (kg)"><input type="number" inputMode="decimal" value={inputs.weight_kg} onChange={e => set('weight_kg', e.target.value)} className={inputCls} /></Field>
                  </div>
                </Section>

                <Section icon="🎯" title="Goal">
                  <div className="grid grid-cols-2 gap-2">{GOALS.map(([v, ic, l]) => <Choice key={v} active={inputs.goal === v} onClick={() => set('goal', v)} icon={ic} text={l} />)}</div>
                </Section>

                <Section icon="🍽️" title="Food preference">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">{DIETS.map(([v, ic, l]) => <Choice key={v} active={inputs.diet_type === v} onClick={() => set('diet_type', v)} icon={ic} text={l} />)}</div>
                </Section>

                <Section icon="⏰" title="Daily routine">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <Field label="☀️ Wake up"><input type="time" value={inputs.wake_time} onChange={e => set('wake_time', e.target.value)} className={inputCls} /></Field>
                    <Field label="🏋️ Workout"><input type="time" value={inputs.workout_time} onChange={e => set('workout_time', e.target.value)} className={inputCls} /></Field>
                    <Field label="🌙 Sleep"><input type="time" value={inputs.sleep_time} onChange={e => set('sleep_time', e.target.value)} className={inputCls} /></Field>
                    <Field label="🍽️ Meals / day">
                      <select value={inputs.meals} onChange={e => set('meals', e.target.value)} className={inputCls}>
                        {[3, 4, 5, 6, 7].map(n => <option key={n} value={n}>{n}</option>)}
                      </select>
                    </Field>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="🚶 Activity outside gym">
                      <select value={inputs.activity} onChange={e => set('activity', e.target.value)} className={inputCls}>
                        {ACTIVITY.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                      </select>
                    </Field>
                    <Field label="Budget">
                      <select value={inputs.budget} onChange={e => set('budget', e.target.value)} className={inputCls}>
                        {BUDGET.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                      </select>
                    </Field>
                  </div>
                  <button type="button" onClick={() => set('supplements', !inputs.supplements)}
                    className={`flex items-center justify-between w-full rounded-2xl border-2 px-4 py-2.5 text-sm font-semibold transition-all ${inputs.supplements ? 'border-emerald-500 bg-emerald-50 text-emerald-800' : 'border-gray-100 text-gray-600'}`}>
                    <span>🥤 Member takes whey protein</span>
                    <span className={`w-10 h-6 rounded-full relative transition-colors ${inputs.supplements ? 'bg-emerald-500' : 'bg-gray-200'}`}>
                      <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${inputs.supplements ? 'left-[18px]' : 'left-0.5'}`} />
                    </span>
                  </button>
                </Section>

                <Section icon="📝" title="Notes (optional)">
                  <Field label="🚫 Avoid / allergies"><input value={inputs.avoid} maxLength={200} onChange={e => set('avoid', e.target.value)} placeholder="e.g. peanuts, mushroom, no onion-garlic" className={inputCls} /></Field>
                  <Field label="🩺 Medical notes"><input value={inputs.medical} maxLength={200} onChange={e => set('medical', e.target.value)} placeholder="e.g. diabetes, thyroid, high BP" className={inputCls} /></Field>
                  <Field label="💬 Extra instructions for AI"><input value={inputs.notes} maxLength={300} onChange={e => set('notes', e.target.value)} placeholder="e.g. hostel food, no cooking at night, likes Kolhapuri food" className={inputCls} /></Field>
                </Section>

                <div className="space-y-2">
                  <button onClick={generate} disabled={!!busy}
                    className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-600 hover:from-emerald-600 hover:to-cyan-700 text-white font-extrabold text-sm shadow-md disabled:opacity-50">
                    ✨ Generate diet plan with AI
                  </button>
                  {plans.length > 0 && <button onClick={() => setShowForm(false)} className="w-full text-xs text-gray-400 hover:text-gray-600">Cancel</button>}
                  <p className="text-[11px] text-gray-400 text-center">🔒 Targets are calculated from height, weight, age &amp; activity. Only these details go to AI — never the member's name or mobile.</p>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
