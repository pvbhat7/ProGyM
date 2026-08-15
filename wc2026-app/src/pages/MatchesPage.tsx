import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { API_BASE } from '../api/config'
import AppHeader from '../components/AppHeader'
import BottomNav from '../components/BottomNav'
import SponsorCarousel from '../components/SponsorCarousel'
import TeamFlag from '../components/TeamFlag'
import LiveStrip from '../components/LiveStrip'
import MatchPredictionModal from '../components/MatchPredictionModal'
import { getSession } from '../services/wcSession'
import { ensurePushPermissionAndRegister } from '../services/wcPush'
import { useLaunchGate, launchToastMessage } from '../services/launchGate'
import { toast } from '../components/Toast'
import LaunchCountdown from '../components/LaunchCountdown'

interface MatchRow {
  id: string
  team_a_id: string | null
  team_b_id: string | null
  team_a_label?: string | null
  team_b_label?: string | null
  team_a_name: string | null
  team_a_code: string | null
  team_a_group?: string | null
  team_b_name: string | null
  team_b_code: string | null
  team_b_group?: string | null
  stage: string
  multiplier: string
  kickoff_at: string
  status: string
  // present only on settled / past matches:
  winner?: string | null
  score_a?: string | null
  score_b?: string | null
  first_scorer_name?: string | null
  motm_name?: string | null
  total_goals_range?: string | null
  both_teams_scored?: string | null
  settled_at?: string | null
}

function isPastMatch(m: MatchRow): boolean {
  return m.status === 'settled' || (m.score_a != null && m.score_b != null)
}

// Unsettled (predict-able) matches sort to the top of their group; within
// each bucket sort by kickoff ASC. Keeps "today's settled" below
// "today's upcoming" so users see what they can still predict first.
function sortUnsettledFirst(x: MatchRow, y: MatchRow): number {
  const xPast = isPastMatch(x) ? 1 : 0
  const yPast = isPastMatch(y) ? 1 : 0
  if (xPast !== yPast) return xPast - yPast
  return (kickoffMs(x.kickoff_at) || 0) - (kickoffMs(y.kickoff_at) || 0)
}

const STAGE_LABEL: Record<string, string> = {
  group: 'Group', r32: 'Round of 32', r16: 'Round of 16', qf: 'Quarter-final', sf: 'Semi-final', '3rd': 'Third Place', final: 'Final',
}

function stageLabel(m: { stage: string; team_a_group?: string | null }): string {
  if (m.stage === 'group' && m.team_a_group) return `Group ${m.team_a_group}`
  return STAGE_LABEL[m.stage] || m.stage
}

const STAGE_CHIP: Record<string, string> = {
  group: 'bg-gray-100 text-gray-600',
  r32:   'bg-teal-50 text-teal-700',
  r16:   'bg-blue-50 text-blue-700',
  qf:    'bg-purple-50 text-purple-700',
  sf:    'bg-rose-50 text-rose-700',
  '3rd': 'bg-orange-50 text-orange-700',
  final: 'bg-gradient-to-r from-amber-400 to-yellow-500 text-white',
}

const STAGE_ACCENT: Record<string, string> = {
  group: 'border-l-gray-200',
  r32:   'border-l-teal-400',
  r16:   'border-l-blue-400',
  qf:    'border-l-purple-400',
  sf:    'border-l-rose-400',
  '3rd': 'border-l-orange-400',
  final: 'border-l-amber-400',
}

const STAGE_ORDER: Record<string, number> = {
  group: 0, r32: 1, r16: 2, qf: 3, sf: 4, '3rd': 5, final: 6,
}

// Display fallback for missing team data: real name → label (e.g. "Winner Match 73") → "TBD"
function teamAName(m: Pick<MatchRow, 'team_a_name' | 'team_a_label'>): string {
  return m.team_a_name || m.team_a_label || 'TBD'
}
function teamBName(m: Pick<MatchRow, 'team_b_name' | 'team_b_label'>): string {
  return m.team_b_name || m.team_b_label || 'TBD'
}
function isTbd(m: Pick<MatchRow, 'team_a_id' | 'team_b_id'>): boolean {
  return !m.team_a_id || !m.team_b_id
}

function formatKickoff(dt: string) {
  if (!dt) return ''
  const m = dt.match(/^(\d{4})-(\d{2})-(\d{2})\s(\d{2}):(\d{2})/)
  if (!m) return dt
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  return `${parseInt(m[3], 10)} ${months[parseInt(m[2], 10) - 1]} · ${m[4]}:${m[5]}`
}

function dayKey(dt: string) {
  if (!dt) return 'TBD'
  const m = dt.match(/^(\d{4})-(\d{2})-(\d{2})/)
  return m ? `${m[1]}-${m[2]}-${m[3]}` : 'TBD'
}

function dayLabel(dt: string) {
  const m = dt.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (!m) return 'TBD'
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
  const day = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][d.getDay()]
  return `${day}, ${parseInt(m[3], 10)} ${months[parseInt(m[2], 10) - 1]}`
}

interface ShortDay { day: string; dom: number; mon: string }

function shortDayLabel(dt: string): ShortDay {
  const m = dt.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (!m) return { day: 'TBD', dom: 0, mon: '' }
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
  const day = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][d.getDay()]
  return { day, dom: parseInt(m[3], 10), mon: months[parseInt(m[2], 10) - 1] }
}

// Parse "YYYY-MM-DD HH:MM:SS" as IST and return the corresponding UTC ms epoch
function kickoffMs(dt: string): number | null {
  const m = dt.match(/^(\d{4})-(\d{2})-(\d{2})\s(\d{2}):(\d{2}):?(\d{2})?/)
  if (!m) return null
  const utc = Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +(m[6] || 0))
  return utc - 5.5 * 3600 * 1000
}

// Format a UTC ms epoch as IST clock time, e.g. "8:55 PM"
function formatTimeIst(ms: number): string {
  const ist = new Date(ms + 5.5 * 3600 * 1000)
  let h = ist.getUTCHours()
  const m = ist.getUTCMinutes()
  const ampm = h >= 12 ? 'PM' : 'AM'
  h = h % 12 || 12
  return `${h}:${String(m).padStart(2, '0')} ${ampm}`
}

function useNow(intervalMs = 1000) {
  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), intervalMs)
    return () => clearInterval(t)
  }, [intervalMs])
  return now
}

function formatCountdown(diff: number): string {
  if (diff <= 0) return 'Locked'
  const s = Math.floor(diff / 1000)
  const d = Math.floor(s / 86400)
  const h = Math.floor((s % 86400) / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  if (d > 0) return `${d}d ${h}h ${m}m`
  if (h > 0) return `${h}h ${m}m ${sec}s`
  return `${m}m ${sec}s`
}

const PREDICTION_WINDOW_MS = 24 * 60 * 60 * 1000

// Launch-day exception: matches on these days have the prediction window open from now,
// ignoring the usual 24h-before rule. Keep in sync with api/wc_predictions/submit.php.
const OPEN_NOW_DAYS = new Set<string>(['2026-06-17'])
function isOpenNowDay(dt: string): boolean {
  const m = (dt || '').match(/^(\d{4})-(\d{2})-(\d{2})/)
  return m ? OPEN_NOW_DAYS.has(`${m[1]}-${m[2]}-${m[3]}`) : false
}

function todayIstKey(): string {
  const ist = Date.now() + 5.5 * 3600 * 1000
  const d = new Date(ist)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`
}

export default function MatchesPage() {
  const navigate = useNavigate()
  const session  = getSession()
  const now      = useNow(1000)
  const [matches, setMatches] = useState<MatchRow[]>([])
  const [coins, setCoins]     = useState<number | null>(null)
  const [submittedIds, setSubmittedIds] = useState<Set<string>>(new Set())
  const [lockMinutes, setLockMinutes] = useState<number>(0)
  const [loading, setLoading] = useState(true)
  const [selectedDay, setSelectedDay] = useState<string | null>(null)
  const [groupBy, setGroupBy] = useState<'date' | 'stage'>('date')
  const [modalMatch, setModalMatch] = useState<MatchRow | null>(null)
  const [liveCount, setLiveCount] = useState(0)
  const [liveResolved, setLiveResolved] = useState(false)
  const launch = useLaunchGate()

  const dayStripRef = useRef<HTMLDivElement | null>(null)
  const todayBtnRef = useRef<HTMLButtonElement | null>(null)
  const didCenterTodayRef = useRef(false)

  // Infinite-scroll companions (date mode only):
  //   sectionRefs:    DOM node per visible day-section, observed by IntersectionObserver
  //   pillRefs:       horizontal day-strip buttons, used to auto-center the active pill
  //   scrollToDayRef: pending scroll target after a pill tap (consumed on next render)
  //   activeDay:      day currently at the top of the viewport (drives pill highlight)
  const sectionRefs   = useRef<Map<string, HTMLElement>>(new Map())
  const pillRefs      = useRef<Map<string, HTMLButtonElement>>(new Map())
  const scrollToDayRef = useRef<string | null>(null)
  const [activeDay, setActiveDay] = useState<string | null>(null)

  function handleLiveChange(count: number) {
    setLiveCount(count)
    setLiveResolved(true)
  }

  useEffect(() => {
    const t = setTimeout(() => setLiveResolved(prev => prev || true), 3000)
    return () => clearTimeout(t)
  }, [])

  // Web push: attempt to register on Matches page mount. The page is stable
  // here (unlike right after Signup → navigate), which is much friendlier to
  // mobile Chrome's permission heuristics. Idempotent: a granted permission
  // and an already-registered token just refresh quietly; denied stays denied.
  useEffect(() => {
    if (!session?.clientId) return
    const t = setTimeout(() => {
      ensurePushPermissionAndRegister(session.clientId)
    }, 300)
    return () => clearTimeout(t)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.clientId])

  // Central click handler used by every match card on the page.
  // Decision matrix (per user spec):
  //   - settled match                           → navigate to results page
  //   - prediction submitted (any non-settled)  → modal showing picks
  //   - no prediction + match already started   → modal saying "no prediction"
  //   - otherwise (pre-start, no pick)          → navigate to prediction form
  function handleCardClick(m: MatchRow) {
    if (isPastMatch(m)) { navigate(`/match/${m.id}`); return }
    // TBD matches (teams not yet determined) can't be predicted.
    if (isTbd(m)) {
      toast('Teams not yet confirmed — check back closer to kickoff.')
      return
    }
    // Global launch gate — block prediction navigation until launch time.
    // Settled / past matches always remain viewable.
    if (!launch.isLive) {
      toast(launchToastMessage(launch.launchAtLabel))
      return
    }
    const hasPrediction = submittedIds.has(String(m.id))
    const kt = kickoffMs(m.kickoff_at)
    // Predictions close `lockMinutes` before kickoff. Once we're inside that
    // window the form must not open even though kickoff itself is still in the
    // future — show the read-only modal instead.
    const deadline = kt !== null ? kt - lockMinutes * 60 * 1000 : null
    const lockedNow = deadline !== null && Date.now() >= deadline
    if (hasPrediction || lockedNow) { setModalMatch(m); return }
    navigate(`/match/${m.id}`)
  }

  useEffect(() => {
    Promise.all([
      fetch(`${API_BASE}/wc_matches/upcoming.php`).then(r => r.ok ? r.json() : []),
      fetch(`${API_BASE}/wc_matches/past.php`).then(r => r.ok ? r.json() : []),
    ])
      .then(([up, past]) => {
        const u = Array.isArray(up)   ? up   : []
        const p = Array.isArray(past) ? past : []
        setMatches([...p, ...u])
      })
      .catch(() => setMatches([]))
      .finally(() => setLoading(false))

    fetch(`${API_BASE}/features/get.php`)
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (!d) return
        const n = Math.max(0, parseInt(d.prediction_lock_minutes, 10) || 0)
        setLockMinutes(n)
      })
      .catch(() => {})

    if (session?.clientId) {
      fetch(`${API_BASE}/wc_predictions/myPredictions.php?client_id=${session.clientId}`)
        .then(r => r.ok ? r.json() : null)
        .then(j => {
          if (!j) return
          setCoins(Number(j.total_coins_earned) || 0)
          const ids = new Set<string>()
          for (const p of (j.predictions || [])) ids.add(String(p.match_id))
          setSubmittedIds(ids)
        })
        .catch(() => {})

    }
  }, [session?.clientId])

  // Default selected day: the day of the earliest *unsettled* match. If today's
  // matches are all already settled (e.g. opening the app late evening after
  // every kickoff has finished), we roll forward to the next day with a match
  // still to play, so the user lands on actionable content. Only if literally
  // every match in the tournament is settled do we fall back to the last day.
  useEffect(() => {
    if (selectedDay !== null || matches.length === 0) return
    const unsettled = matches
      .filter(m => !isPastMatch(m))
      .map(m => ({ m, kt: kickoffMs(m.kickoff_at) }))
      .filter((x): x is { m: MatchRow; kt: number } => x.kt !== null)
      .sort((a, b) => a.kt - b.kt)
    if (unsettled.length > 0) {
      setSelectedDay(dayKey(unsettled[0].m.kickoff_at))
      return
    }
    const days = Array.from(new Set(matches.map(m => dayKey(m.kickoff_at)))).sort()
    setSelectedDay(days[days.length - 1])
  }, [matches, selectedDay])

  const lockMs = lockMinutes * 60 * 1000

  // Hero: the chronologically next match whose kickoff is still in the future (IST clock).
  const hero = useMemo<MatchRow | null>(() => {
    if (!matches.length) return null
    const upcoming = matches
      .map(m => ({ m, kt: kickoffMs(m.kickoff_at) }))
      .filter((x): x is { m: MatchRow; kt: number } => x.kt !== null && x.kt > now && !isTbd(x.m))
      .sort((a, b) => a.kt - b.kt)
    return upcoming[0]?.m || null
  }, [matches, now])

  // Horizontal day-strip data
  const dayStrip = useMemo(() => {
    const map = new Map<string, MatchRow[]>()
    for (const m of matches) {
      const k = dayKey(m.kickoff_at)
      if (!map.has(k)) map.set(k, [])
      map.get(k)!.push(m)
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, ms]) => ({ k, label: shortDayLabel(ms[0].kickoff_at), count: ms.length }))
  }, [matches])

  // Center today's date in the horizontal day strip on first render.
  // Why: tournament started 2026-06-17 so days before "today" occupy the
  // visible window — without auto-centering, today scrolls off-screen.
  useEffect(() => {
    if (didCenterTodayRef.current) return
    if (loading || groupBy !== 'date') return
    const container = dayStripRef.current
    const btn = todayBtnRef.current
    if (!container || !btn) return
    const target = btn.offsetLeft - (container.clientWidth / 2) + (btn.offsetWidth / 2)
    container.scrollTo({ left: Math.max(0, target), behavior: 'auto' })
    didCenterTodayRef.current = true
  }, [loading, groupBy, dayStrip])

  // IntersectionObserver: in date mode, watch each rendered day-section and
  // promote whichever one is currently crossing the top of the viewport to
  // "active". The trigger band sits just below the top edge (-10% top inset)
  // and well above the bottom (-75% bottom inset), so a section becomes active
  // the moment its header scrolls under that band.
  useEffect(() => {
    if (groupBy !== 'date') return
    const entries = Array.from(sectionRefs.current.entries())
    if (entries.length === 0) return
    const observer = new IntersectionObserver((records) => {
      const inBand = records
        .filter(r => r.isIntersecting)
        .map(r => ({
          key: (r.target as HTMLElement).dataset.dayKey || '',
          top: r.boundingClientRect.top,
        }))
        .filter(s => s.key)
        .sort((a, b) => a.top - b.top)
      if (inBand[0]) setActiveDay(inBand[0].key)
    }, { rootMargin: '-10% 0px -75% 0px', threshold: 0 })
    entries.forEach(([, el]) => observer.observe(el))
    return () => observer.disconnect()
  }, [groupBy, selectedDay, matches])

  // After a pill tap, scroll the newly-anchored section to the top. We defer
  // via ref because the new section may not be in the DOM until React re-renders.
  useEffect(() => {
    const target = scrollToDayRef.current
    if (!target) return
    scrollToDayRef.current = null
    const el = sectionRefs.current.get(target)
    if (!el) return
    const top = el.getBoundingClientRect().top + window.scrollY - 12
    window.scrollTo({ top, behavior: 'smooth' })
  })

  // Keep the active day pill horizontally centered as the user scrolls.
  useEffect(() => {
    if (groupBy !== 'date' || !activeDay) return
    const container = dayStripRef.current
    const btn = pillRefs.current.get(activeDay)
    if (!container || !btn) return
    const target = btn.offsetLeft - (container.clientWidth / 2) + (btn.offsetWidth / 2)
    container.scrollTo({ left: Math.max(0, target), behavior: 'smooth' })
  }, [activeDay, groupBy])

  // Filtered + grouped list for the body
  const visible = useMemo(() => {
    if (groupBy === 'date') {
      // Infinite-forward semantics: selectedDay is the *anchor* (start of list),
      // not a hard filter. The list runs from the anchor day to the last
      // tournament day; the user can keep scrolling forward to load each next
      // date's matches. Tapping a pill resets the anchor to that day.
      const list = selectedDay
        ? matches.filter(m => dayKey(m.kickoff_at) >= selectedDay)
        : matches
      const groups = new Map<string, MatchRow[]>()
      for (const m of list) {
        const k = dayKey(m.kickoff_at)
        if (!groups.has(k)) groups.set(k, [])
        groups.get(k)!.push(m)
      }
      return Array.from(groups.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([k, items]) => ({
          key: k,
          label: dayLabel(items[0].kickoff_at),
          items: items.slice().sort(sortUnsettledFirst),
        }))
    }
    const groups = new Map<string, MatchRow[]>()
    for (const m of matches) {
      if (!groups.has(m.stage)) groups.set(m.stage, [])
      groups.get(m.stage)!.push(m)
    }
    return Array.from(groups.entries())
      .sort(([a], [b]) => (STAGE_ORDER[a] ?? 99) - (STAGE_ORDER[b] ?? 99))
      .map(([k, items]) => ({
        key: k,
        label: STAGE_LABEL[k] || k,
        items: items.slice().sort(sortUnsettledFirst),
      }))
  }, [matches, selectedDay, groupBy])


  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <AppHeader title="Matches" subtitle={session ? `Hi ${session.name}` : undefined} rightCoins={coins} showReferShortcut />

      <main className="max-w-md mx-auto px-3 py-3">
        <div className="mb-3 -mx-3 first:mt-0"><LaunchCountdown variant="banner" /></div>

        {/* Contests row — Bonanza (primary, 7 of 10) + Awards (secondary, 3 of 10).
            Single row keeps the top of the matches list above the fold. */}
        <div className="flex gap-2 mb-3">
          <button
            onClick={() => navigate('/knockout-bonanza')}
            className="relative flex-[6] text-left rounded-xl bg-gradient-to-br from-purple-700 via-fuchsia-600 to-rose-500 text-white px-3 py-2.5 shadow-md active:scale-[0.99] transition-transform overflow-hidden"
          >
            <div className="pointer-events-none absolute -top-8 -right-8 w-24 h-24 bg-white/15 rounded-full blur-xl" />
            <div className="relative flex items-center gap-2">
              <span className="text-xl drop-shadow flex-shrink-0">💎</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-[8px] uppercase tracking-[0.18em] font-black bg-white/25 px-1 py-0.5 rounded leading-none">New</span>
                  <p className="font-black text-[13px] leading-none">Knockout Bonanza</p>
                </div>
                <p className="text-purple-100 text-[10px] leading-snug mt-0.5">Top 3 win special reward</p>
              </div>
              <span className="text-white font-black text-base flex-shrink-0">→</span>
            </div>
          </button>

          <button
            onClick={() => navigate('/awards')}
            className="relative flex-[4] text-left rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 text-white px-2.5 py-2.5 shadow-md active:scale-[0.99] transition-transform overflow-hidden"
            title="Tournament Awards · up to 250 coins"
          >
            <div className="pointer-events-none absolute -top-6 -right-6 w-16 h-16 bg-white/15 rounded-full blur-lg" />
            <div className="relative flex items-center gap-2">
              <span className="text-xl leading-none flex-shrink-0">🏆</span>
              <div className="flex-1 min-w-0">
                <p className="font-black text-[11px] leading-tight">Tournament<br/>Awards</p>
                <p className="text-amber-50 text-[9px] leading-tight mt-0.5">250 coins</p>
              </div>
            </div>
          </button>
        </div>

        {/* Live now strip (polls ESPN via our PHP proxy every 30s) */}
        <LiveStrip onLiveChange={handleLiveChange} />

        {/* Skeleton placeholder while we wait to learn whether a match is live.
            Without this we'd briefly show the full-size hero, then snap it down
            to compact when LiveStrip reports there IS a live match — visible jump. */}
        {!loading && hero && !liveResolved && (
          <div className="w-full rounded-2xl bg-gray-100 animate-pulse mb-4" style={{ height: 56 }} />
        )}

        {/* Hero next-match — compact strip when a live match is on */}
        {!loading && hero && liveResolved && liveCount > 0 && (() => {
          const t = kickoffMs(hero.kickoff_at)
          const diff = t !== null ? t - now : 0
          const subm = submittedIds.has(String(hero.id))
          return (
            <button
              onClick={() => handleCardClick(hero)}
              className="w-full text-left bg-white border border-gray-200 rounded-2xl px-3 py-2.5 shadow-sm mb-4 active:scale-[0.99] transition-transform flex items-center gap-3"
            >
              <span className="text-[9px] uppercase tracking-wider font-black text-blue-700 bg-blue-50 border border-blue-100 px-1.5 py-0.5 rounded-full flex-shrink-0">⚡ Next</span>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <TeamFlag code={hero.team_a_code} size={40} className="w-5 h-3.5" />
                <span className="text-xs font-bold text-gray-800">{hero.team_a_code}</span>
                <span className="text-[10px] text-gray-400">vs</span>
                <TeamFlag code={hero.team_b_code} size={40} className="w-5 h-3.5" />
                <span className="text-xs font-bold text-gray-800">{hero.team_b_code}</span>
              </div>
              <div className="flex-1 min-w-0 text-right">
                <p className="text-[10px] uppercase tracking-wider text-gray-400 font-bold leading-none">
                  {subm ? '✓ Submitted · starts in' : diff > 0 ? 'Starts in' : 'Now'}
                </p>
                <p className="text-xs font-black text-gray-800 tabular-nums">
                  {diff > 0 ? formatCountdown(diff) : '—'}
                </p>
              </div>
              <span className="text-blue-600 font-black text-sm flex-shrink-0">→</span>
            </button>
          )
        })()}

        {/* Hero next-match card — compact dark strip (when no live match).
            Two rows: meta + teams · countdown + CTA. ~3x smaller than full-size. */}
        {!loading && hero && liveResolved && liveCount === 0 && (() => {
          const t = kickoffMs(hero.kickoff_at)
          const deadlineT = t !== null ? t - lockMs : null
          const windowOpensT = t !== null ? t - PREDICTION_WINDOW_MS : null
          const notOpen = !isOpenNowDay(hero.kickoff_at) && windowOpensT !== null && now < windowOpensT
          const openDiff = windowOpensT !== null ? windowOpensT - now : 0
          const diff = deadlineT !== null ? deadlineT - now : 0
          const subm = submittedIds.has(String(hero.id))
          const locked = !notOpen && diff <= 0
          const urgent = !notOpen && !locked && diff > 0 && diff < 60 * 60 * 1000
          const countdownText =
            subm && t !== null   ? formatCountdown(t - now)
          : notOpen              ? formatCountdown(openDiff)
                                 : formatCountdown(diff)
          const countdownLabel = subm ? 'starts in' : notOpen ? 'opens in' : diff > 0 ? (lockMinutes > 0 ? 'closes in' : 'starts in') : 'locked'
          const ctaText  = subm ? '✓ Submitted' : notOpen ? '🔒 Not open' : locked ? '🔒 Locked' : urgent ? '⏳ Predict now' : 'Predict →'
          const ctaColor = subm ? 'text-sky-400' : locked ? 'text-slate-500' : urgent ? 'text-amber-400' : 'text-blue-400'
          return (
            <button
              onClick={() => handleCardClick(hero)}
              className="w-full text-left bg-slate-900 text-white rounded-xl shadow-md mb-4 active:scale-[0.99] transition-all relative overflow-hidden border border-slate-800"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-transparent to-indigo-500/10 pointer-events-none" />
              <div className="relative px-3 py-2.5">
                {/* Row 1: meta */}
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[9px] uppercase tracking-[0.18em] font-black text-amber-400 flex items-center gap-1">
                    <span>⚡</span> Next Match
                  </span>
                  <span className="text-[9px] uppercase tracking-[0.15em] font-bold text-slate-400">
                    {stageLabel(hero)}
                  </span>
                </div>
                {/* Row 2: teams + countdown + CTA */}
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {hero.team_a_code && <TeamFlag code={hero.team_a_code} size={80} className="w-7 h-5 rounded-sm ring-1 ring-white/10" />}
                    <span className="text-[11px] font-bold tabular-nums">{hero.team_a_code || 'TBD'}</span>
                  </div>
                  <span className="text-slate-500 font-bold text-[10px] tracking-[0.2em]">VS</span>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {hero.team_b_code && <TeamFlag code={hero.team_b_code} size={80} className="w-7 h-5 rounded-sm ring-1 ring-white/10" />}
                    <span className="text-[11px] font-bold tabular-nums">{hero.team_b_code || 'TBD'}</span>
                  </div>
                  <div className="flex-1" />
                  {!locked && (
                    <div className="text-right leading-tight">
                      <p className="text-[8px] uppercase tracking-[0.18em] text-slate-500 font-bold">{countdownLabel}</p>
                      <p className={`text-[13px] font-black tabular-nums ${!subm && urgent ? 'text-amber-400 animate-pulse' : 'text-white'}`}>{countdownText}</p>
                    </div>
                  )}
                  <span className={`text-[11px] font-bold flex-shrink-0 ${ctaColor}`}>{ctaText}</span>
                </div>
              </div>
            </button>
          )
        })()}

        {/* Group-by toggle */}
        {!loading && matches.length > 0 && (
          <div className="flex items-center gap-2 mb-3">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Group by</p>
            <div className="flex bg-white border border-gray-200 rounded-full p-0.5 text-[11px] font-semibold shadow-sm">
              <button
                onClick={() => setGroupBy('date')}
                className={`px-3 py-1 rounded-full transition-colors ${groupBy === 'date' ? 'bg-blue-600 text-white' : 'text-gray-500'}`}
              >Date</button>
              <button
                onClick={() => setGroupBy('stage')}
                className={`px-3 py-1 rounded-full transition-colors ${groupBy === 'stage' ? 'bg-blue-600 text-white' : 'text-gray-500'}`}
              >Stage</button>
            </div>
          </div>
        )}

        {/* Day strip (date mode only) */}
        {!loading && matches.length > 0 && groupBy === 'date' && (
          <div
            ref={dayStripRef}
            className="-mx-3 px-3 mb-3 overflow-x-auto [&::-webkit-scrollbar]:hidden"
            style={{ scrollbarWidth: 'none' }}
          >
            <div className="flex gap-2 pb-1 min-w-min">
              <button
                onClick={() => {
                  setSelectedDay(null)
                  setActiveDay(null)
                  window.scrollTo({ top: 0, behavior: 'smooth' })
                }}
                className={`flex-shrink-0 px-3 rounded-xl text-[11px] font-bold flex flex-col items-center justify-center min-w-[56px] py-1.5 ${
                  selectedDay === null ? 'bg-blue-600 text-white shadow' : 'bg-white border border-gray-200 text-gray-600'
                }`}
              >
                <span className="text-[10px] font-bold uppercase tracking-wider opacity-80">All</span>
                <span className="text-sm font-black leading-tight">{matches.length}</span>
                <span className="text-[9px] font-semibold opacity-70">matches</span>
              </button>
              {dayStrip.map(d => {
                const today   = todayIstKey()
                const isToday = d.k === today
                const isPast  = d.k < today
                const active  = (activeDay ?? selectedDay) === d.k
                return (
                  <button
                    key={d.k}
                    ref={(el) => {
                      if (el) pillRefs.current.set(d.k, el)
                      else pillRefs.current.delete(d.k)
                      if (isToday) todayBtnRef.current = el
                    }}
                    onClick={() => {
                      setSelectedDay(d.k)
                      setActiveDay(d.k)
                      scrollToDayRef.current = d.k
                    }}
                    className={`flex-shrink-0 px-3 py-1.5 rounded-xl flex flex-col items-center min-w-[56px] ${
                      active ? 'bg-blue-600 text-white shadow'
                        : isPast ? 'bg-gray-50 border border-gray-200 text-gray-400'
                        : 'bg-white border border-gray-200 text-gray-600'
                    }`}
                  >
                    <span className={`text-[10px] font-bold uppercase tracking-wider ${
                      active ? 'opacity-90' : isToday ? 'text-blue-700' : 'opacity-70'
                    }`}>
                      {isToday ? 'Today' : d.label.day}
                    </span>
                    <span className="text-sm font-black leading-tight">{d.label.dom}</span>
                    <span className={`text-[9px] font-semibold ${active ? 'opacity-90' : 'opacity-70'}`}>
                      {d.label.mon} · {isPast ? '🏁' : ''}{d.count}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {loading && (
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="bg-white rounded-2xl p-4 border border-gray-100 animate-pulse">
                <div className="h-4 bg-gray-100 rounded w-1/2 mb-3" />
                <div className="h-5 bg-gray-200 rounded w-2/3" />
              </div>
            ))}
          </div>
        )}

        {!loading && matches.length === 0 && (
          <div className="text-center py-20 text-gray-400">
            <p className="text-5xl mb-3">⚽</p>
            <p className="font-semibold text-gray-600">No upcoming matches</p>
            <p className="text-sm mt-1">Check back later.</p>
          </div>
        )}

        {!loading && visible.map(group => (
          <section
            key={group.key}
            ref={(el) => {
              if (el) {
                if (groupBy === 'date') sectionRefs.current.set(group.key, el)
              } else {
                sectionRefs.current.delete(group.key)
              }
            }}
            data-day-key={group.key}
            className="mb-4"
          >
            <h2 className="text-[11px] font-bold text-gray-500 uppercase tracking-wider px-1 mb-2 flex items-center gap-2">
              <span>{group.label}</span>
              <span className="text-gray-300">·</span>
              <span className="text-gray-400 normal-case font-semibold tracking-normal">
                {group.items.length} {group.items.length === 1 ? 'match' : 'matches'}
              </span>
            </h2>
            <div className="space-y-2">
              {group.items.map(m => {
                const past = isPastMatch(m)
                const t = kickoffMs(m.kickoff_at)
                const deadlineT = t !== null ? t - lockMs : null
                const diff = deadlineT !== null ? deadlineT - now : 0
                const locked = diff <= 0
                const urgent = !locked && diff < 60 * 60 * 1000
                const subm = submittedIds.has(String(m.id))
                const chip   = STAGE_CHIP[m.stage]   || STAGE_CHIP.group
                const accent = STAGE_ACCENT[m.stage] || STAGE_ACCENT.group

                const windowOpensT = t !== null ? t - PREDICTION_WINDOW_MS : null
                const notOpen = !past && !isOpenNowDay(m.kickoff_at) && windowOpensT !== null && now < windowOpensT
                const openDiff = windowOpensT !== null ? windowOpensT - now : 0

                if (past) {
                  const isDraw = m.winner === 'DRAW'
                  const winnerName =
                    m.winner === 'A'    ? m.team_a_name
                  : m.winner === 'B'    ? m.team_b_name
                  : isDraw              ? 'Draw'
                  : null
                  const winScore = m.winner === 'A' ? Number(m.score_a) : m.winner === 'B' ? Number(m.score_b) : null
                  const losScore = m.winner === 'A' ? Number(m.score_b) : m.winner === 'B' ? Number(m.score_a) : null
                  const margin   = (winScore != null && losScore != null) ? winScore - losScore : null
                  const wonLabel = winnerName
                    ? isDraw
                      ? `Draw ${m.score_a ?? '?'}–${m.score_b ?? '?'}`
                      : margin === 1
                        ? `${winnerName} won by 1 goal`
                        : margin != null && margin > 1
                          ? `${winnerName} won by ${margin} goals`
                          : `${winnerName} won ${winScore}–${losScore}`
                    : null

                  // Confetti pieces (only when a winner is decided, not draw)
                  const confetti = !isDraw && winnerName ? [
                    { left: '8%',  delay: '0s',    color: 'text-amber-400',   ch: '🎉' },
                    { left: '22%', delay: '0.4s',  color: 'text-rose-400',    ch: '✨' },
                    { left: '38%', delay: '0.9s',  color: 'text-blue-400', ch: '🎊' },
                    { left: '55%', delay: '0.2s',  color: 'text-sky-400',     ch: '⭐' },
                    { left: '72%', delay: '0.7s',  color: 'text-amber-400',   ch: '🎉' },
                    { left: '88%', delay: '1.1s',  color: 'text-rose-400',    ch: '✨' },
                  ] : []

                  return (
                    <button
                      key={m.id}
                      onClick={() => handleCardClick(m)}
                      className={`relative w-full text-left bg-gradient-to-br from-amber-50 via-white to-blue-50 rounded-2xl border border-amber-200/70 border-l-4 ${accent} hover:shadow-md transition-all p-3 overflow-hidden`}
                    >
                      {/* Decorative blurred halos */}
                      <div className="pointer-events-none absolute -top-10 -right-10 w-32 h-32 bg-amber-300/30 rounded-full blur-2xl" />
                      <div className="pointer-events-none absolute -bottom-10 -left-10 w-32 h-32 bg-blue-300/20 rounded-full blur-2xl" />
                      {/* Confetti */}
                      {confetti.map((c, i) => (
                        <span
                          key={i}
                          aria-hidden
                          className={`pointer-events-none absolute top-1 text-xs ${c.color} wc-confetti`}
                          style={{ left: c.left, animationDelay: c.delay }}
                        >
                          {c.ch}
                        </span>
                      ))}

                      <div className="relative flex items-center gap-1.5 mb-2 flex-wrap">
                        <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full font-semibold ${chip}`}>
                          {stageLabel(m)}
                        </span>
                        <span className="ml-auto text-[11px] text-gray-500 font-medium">{formatKickoff(m.kickoff_at)}</span>
                      </div>

                      <div className="relative flex items-center gap-2">
                        <div className="flex-1 text-center">
                          <div className="flex justify-center mb-1">
                            <TeamFlag code={m.team_a_code} size={80} className={`w-10 h-7 ${m.winner === 'A' ? 'ring-2 ring-amber-400 ring-offset-1' : 'opacity-50 grayscale'}`} />
                          </div>
                          <p className={`text-sm font-bold truncate ${m.winner === 'A' ? 'text-amber-700' : 'text-gray-400'}`}>
                            {m.team_a_name}
                          </p>
                          <p className="text-[10px] text-gray-400 tracking-wider">{m.team_a_code}</p>
                        </div>
                        <div className="px-1 text-center">
                          <p className="text-2xl font-black text-gray-900 tabular-nums leading-none">
                            {m.score_a ?? '?'}<span className="text-gray-300 mx-1">–</span>{m.score_b ?? '?'}
                          </p>
                          <p className="text-[9px] uppercase tracking-wider text-gray-400 font-semibold mt-1">Final</p>
                        </div>
                        <div className="flex-1 text-center">
                          <div className="flex justify-center mb-1">
                            <TeamFlag code={m.team_b_code} size={80} className={`w-10 h-7 ${m.winner === 'B' ? 'ring-2 ring-amber-400 ring-offset-1' : 'opacity-50 grayscale'}`} />
                          </div>
                          <p className={`text-sm font-bold truncate ${m.winner === 'B' ? 'text-amber-700' : 'text-gray-400'}`}>
                            {m.team_b_name}
                          </p>
                          <p className="text-[10px] text-gray-400 tracking-wider">{m.team_b_code}</p>
                        </div>
                      </div>

                      {wonLabel && (
                        <div className="relative mt-2 mx-auto px-2.5 py-1 inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-300 text-amber-900 text-[11px] font-black shadow-sm w-full justify-center overflow-hidden">
                          <span className="wc-shine absolute inset-0 pointer-events-none" />
                          {!isDraw && <span className="wc-trophy">🏆</span>}
                          <span className="relative">{wonLabel}</span>
                          {!isDraw && <span className="wc-trophy">🎉</span>}
                        </div>
                      )}

                      <div className="relative mt-2 border-t border-amber-100 pt-2 flex items-center justify-between">
                        <span className="text-[11px] font-semibold text-gray-500 truncate">
                          {subm ? 'You predicted this match' : 'No prediction made'}
                        </span>
                        <span className="text-[11px] font-bold text-blue-700">
                          {subm ? 'See result →' : 'View →'}
                        </span>
                      </div>
                    </button>
                  )
                }

                return (
                  <button
                    key={m.id}
                    onClick={() => handleCardClick(m)}
                    className={`w-full text-left bg-white rounded-2xl border border-gray-100 border-l-4 ${accent} hover:border-blue-300 hover:shadow-sm transition-all p-3`}
                  >
                    <div className="flex items-center gap-1.5 mb-2 flex-wrap">
                      <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full font-semibold ${chip}`}>
                        {stageLabel(m)}
                      </span>
                      <span className="ml-auto text-[11px] text-gray-500 font-medium">{formatKickoff(m.kickoff_at)}</span>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="flex-1 text-center">
                        <div className="flex justify-center mb-1">
                          {m.team_a_code
                            ? <TeamFlag code={m.team_a_code} size={80} className="w-10 h-7" />
                            : <span className="w-10 h-7 inline-flex items-center justify-center bg-gray-100 text-gray-400 rounded-sm" aria-hidden>🛡</span>}
                        </div>
                        <p className={`text-sm font-bold truncate ${m.team_a_name ? 'text-gray-800' : 'text-gray-400'}`}>{teamAName(m)}</p>
                        <p className="text-[10px] text-gray-400 tracking-wider">{m.team_a_code || ''}</p>
                      </div>
                      <div className="text-gray-300 font-bold text-sm px-1">VS</div>
                      <div className="flex-1 text-center">
                        <div className="flex justify-center mb-1">
                          {m.team_b_code
                            ? <TeamFlag code={m.team_b_code} size={80} className="w-10 h-7" />
                            : <span className="w-10 h-7 inline-flex items-center justify-center bg-gray-100 text-gray-400 rounded-sm" aria-hidden>🛡</span>}
                        </div>
                        <p className={`text-sm font-bold truncate ${m.team_b_name ? 'text-gray-800' : 'text-gray-400'}`}>{teamBName(m)}</p>
                        <p className="text-[10px] text-gray-400 tracking-wider">{m.team_b_code || ''}</p>
                      </div>
                    </div>

                    <div className="mt-2 border-t border-gray-50 pt-2">
                      {notOpen && windowOpensT !== null && (
                        <p className="text-[10px] text-gray-500 mb-1">
                          🕒 Window opens <span className="font-bold text-gray-700">{formatTimeIst(windowOpensT)}</span>
                        </p>
                      )}
                      {!notOpen && lockMinutes > 0 && deadlineT !== null && !locked && (
                        <p className="text-[10px] text-gray-500 mb-1">
                          ⏰ Predict before <span className="font-bold text-gray-700">{formatTimeIst(deadlineT)}</span>
                        </p>
                      )}
                      <div className="flex items-center justify-between">
                        <span className={`text-[11px] font-semibold tabular-nums ${
                          notOpen ? 'text-sky-600' : urgent ? 'text-red-500' : 'text-gray-500'
                        }`}>
                          {notOpen ? `🕒 Opens in ${formatCountdown(openDiff)}`
                            : locked ? '🔒 Locked'
                            : `⏱ ${formatCountdown(diff)}`}
                        </span>
                        <span className={`text-[11px] font-bold ${
                          notOpen ? 'text-sky-700'
                            : locked ? 'text-gray-400'
                            : subm ? 'text-indigo-600'
                            : urgent ? 'text-red-500 animate-pulse'
                            : 'text-blue-700'
                        }`}>
                          {notOpen ? 'See details →'
                            : locked ? 'View →'
                            : subm ? '✓ Submitted'
                            : urgent ? '⏳ Closes soon!'
                            : '🎯 Predict →'}
                        </span>
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          </section>
        ))}
      </main>

      <SponsorCarousel />

      <BottomNav />

      {modalMatch && (
        <MatchPredictionModal
          matchId={Number(modalMatch.id)}
          teamACode={modalMatch.team_a_code}
          teamAName={modalMatch.team_a_name}
          teamBCode={modalMatch.team_b_code}
          teamBName={modalMatch.team_b_name}
          kickoffAt={modalMatch.kickoff_at}
          onClose={() => setModalMatch(null)}
        />
      )}
    </div>
  )
}
