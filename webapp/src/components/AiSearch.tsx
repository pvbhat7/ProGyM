import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { API_BASE } from '../api/config'
import { getIdTokenOrThrow } from '../firebase'

// AI Search for the Admin Dashboard hero. Questions go to api/ai/ask.php with the admin's
// Firebase ID token (the server checks it belongs to an admin_user). Every number in the
// answer comes from read-only database lookups; "View list" shows the rows it was based on.

type Evidence = { label: string; columns: string[]; rows: Array<Record<string, string | number | null>>; total: number }
type Turn = { q: string; a: string; evidence: Evidence | null; error?: boolean }

const LANGS = [
  { code: 'en-IN', label: 'EN' },
  { code: 'hi-IN', label: 'हिं' },
  { code: 'mr-IN', label: 'मर' },
] as const
const LANG_KEY = 'progym_ai_voice_lang'

const SUGGESTIONS = ["Today's summary", 'Who expires this week?', 'Total pending dues', 'Absent 10+ days']

type SpeechRec = {
  lang: string; interimResults: boolean; continuous: boolean
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void) | null
  onend: (() => void) | null; onerror: ((e: { error: string }) => void) | null
  start: () => void; stop: () => void
}
function speechCtor(): (new () => SpeechRec) | null {
  const w = window as unknown as { SpeechRecognition?: new () => SpeechRec; webkitSpeechRecognition?: new () => SpeechRec }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null
}

/** Human message for a SpeechRecognition error code. */
function voiceErrorText(code: string, lang: string): string {
  const name = lang === 'mr-IN' ? 'Marathi' : lang === 'hi-IN' ? 'Hindi' : 'English'
  if (code === 'language-not-supported')
    return `This phone/browser can't recognise ${name} voice. Use the keyboard's mic (e.g. Gboard voice typing) to speak into the box, or switch to Chrome on Android.`
  if (code === 'not-allowed' || code === 'service-not-allowed')
    return 'Microphone or speech service is blocked. Allow the mic for this site in browser settings (on iPhone, try opening progym.co.in in Safari instead of the home-screen app).'
  if (code === 'no-speech') return "Didn't hear anything — tap the mic and speak again."
  if (code === 'network') return 'Voice needs internet — check the connection and try again.'
  if (code === 'aborted') return ''
  return `Voice input failed (${code}). You can type the question instead.`
}

/** Minimal rendering: keeps line breaks and **bold**, turns "* " bullets into dots. */
function renderAnswer(text: string) {
  return text.split('\n').map((line, i) => {
    const bullet = /^\s*[*-]\s+/.test(line)
    const body = line.replace(/^\s*[*-]\s+/, '')
    const parts = body.split(/(\*\*[^*]+\*\*)/g).map((p, j) =>
      p.startsWith('**') && p.endsWith('**') ? <b key={j} className="text-white">{p.slice(2, -2)}</b> : <span key={j}>{p}</span>)
    if (!body.trim()) return <div key={i} className="h-1.5" />
    return bullet
      ? <div key={i} className="flex gap-2 pl-1"><span className="text-orange-400">•</span><span>{parts}</span></div>
      : <div key={i}>{parts}</div>
  })
}

export default function AiSearch() {
  const navigate = useNavigate()
  const [q, setQ] = useState('')
  const [busy, setBusy] = useState(false)
  const [turns, setTurns] = useState<Turn[]>([])
  const [showList, setShowList] = useState(false)
  const [listening, setListening] = useState(false)
  const [lang, setLang] = useState<string>(() => localStorage.getItem(LANG_KEY) || 'en-IN')
  const [voiceErr, setVoiceErr] = useState('')
  const recRef = useRef<SpeechRec | null>(null)
  const voiceOk = speechCtor() !== null

  useEffect(() => () => recRef.current?.stop(), [])

  async function ask(question: string) {
    const text = question.trim()
    if (!text || busy) return
    setBusy(true); setShowList(false)
    const history = turns.filter(t => !t.error).slice(-3).map(t => ({ q: t.q, a: t.a }))
    try {
      const token = await getIdTokenOrThrow('AI Search')
      const r = await fetch(`${API_BASE}/ai/ask.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ question: text, history }),
      })
      const d = await r.json().catch(() => ({ error: 'The AI service did not respond. Please try again.' }))
      if (!r.ok || d.error) throw new Error(d.error || 'Something went wrong. Please try again.')
      setTurns(prev => [...prev, { q: text, a: d.answer, evidence: d.evidence ?? null }].slice(-6))
      setQ('')
    } catch (e) {
      setTurns(prev => [...prev, { q: text, a: e instanceof Error ? e.message : 'Something went wrong.', evidence: null, error: true }].slice(-6))
    } finally {
      setBusy(false)
    }
  }

  function toggleMic() {
    if (listening) { recRef.current?.stop(); return }
    const Ctor = speechCtor()
    if (!Ctor) return
    const rec = new Ctor()
    rec.lang = lang; rec.interimResults = true; rec.continuous = false
    let finalText = ''
    setVoiceErr('')
    rec.onresult = e => {
      // Rebuild from all results each time — some browsers resend earlier final results.
      let fin = '', interim = ''
      for (let i = 0; i < e.results.length; i++) {
        const res = e.results[i]
        if (res.isFinal) fin += res[0].transcript
        else interim += res[0].transcript
      }
      finalText = fin
      setQ((fin + interim).trim())
    }
    rec.onerror = e => {
      setListening(false)
      setVoiceErr(voiceErrorText(e.error, lang))
    }
    rec.onend = () => { setListening(false); if (finalText.trim()) ask(finalText) }
    recRef.current = rec
    setListening(true)
    rec.start()
  }

  const last = turns[turns.length - 1]

  return (
    <div className="w-full">
      <form onSubmit={e => { e.preventDefault(); ask(q) }}
        className={`flex items-center gap-2 rounded-2xl bg-white/10 border px-3 py-2 backdrop-blur transition-colors ${listening ? 'border-orange-400' : 'border-white/15 focus-within:border-orange-400/70'}`}>
        <span className="text-lg">✨</span>
        <input
          value={q} onChange={e => setQ(e.target.value)} disabled={busy}
          placeholder={listening ? 'Listening… speak now' : 'Ask anything about your gym…'}
          className="flex-1 min-w-0 bg-transparent text-white placeholder-slate-400 text-sm outline-none py-1.5"
          maxLength={500}
        />
        {voiceOk && (
          <>
            <select value={lang} onChange={e => { setLang(e.target.value); localStorage.setItem(LANG_KEY, e.target.value) }}
              title="Voice language" className="bg-transparent text-slate-300 text-xs outline-none cursor-pointer">
              {LANGS.map(l => <option key={l.code} value={l.code} className="text-gray-800">{l.label}</option>)}
            </select>
            <button type="button" onClick={toggleMic} disabled={busy} title={listening ? 'Stop' : 'Ask by voice'}
              className={`w-9 h-9 shrink-0 rounded-full flex items-center justify-center transition-colors disabled:opacity-40 ${listening ? 'bg-orange-500 text-white animate-pulse' : 'bg-white/10 text-slate-200 hover:bg-white/20'}`}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
              </svg>
            </button>
          </>
        )}
        <button type="submit" disabled={busy || !q.trim()}
          className="shrink-0 px-3 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold disabled:opacity-40">
          {busy ? 'Thinking…' : 'Ask'}
        </button>
      </form>

      {voiceErr && (
        <div className="mt-2 text-[11px] text-amber-300 bg-amber-500/10 border border-amber-400/20 rounded-lg px-2.5 py-1.5">
          🎤 {voiceErr}
        </div>
      )}

      {turns.length === 0 && !busy && (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {SUGGESTIONS.map(s => (
            <button key={s} type="button" onClick={() => ask(s)}
              className="text-[11px] text-slate-300 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full px-2.5 py-1">
              {s}
            </button>
          ))}
        </div>
      )}

      {busy && (
        <div className="mt-3 flex items-center gap-2 text-sm text-slate-300">
          <span className="w-2 h-2 rounded-full bg-orange-400 animate-bounce" />
          Looking it up in your gym data…
        </div>
      )}

      {last && !busy && (
        <div className="mt-3 rounded-2xl bg-slate-950/60 border border-white/10 p-4 text-sm text-slate-200 leading-relaxed max-h-[60vh] overflow-y-auto">
          <div className="flex items-start justify-between gap-3 mb-2">
            <p className="text-xs text-slate-400">You asked: <span className="text-slate-300">{last.q}</span></p>
            <button type="button" onClick={() => { setTurns([]); setShowList(false) }}
              className="text-[11px] text-slate-500 hover:text-slate-300 shrink-0">Clear</button>
          </div>
          <div className={`space-y-0.5 ${last.error ? 'text-amber-300' : ''}`}>{renderAnswer(last.a)}</div>

          {last.evidence && (
            <div className="mt-3 pt-3 border-t border-white/10">
              <button type="button" onClick={() => setShowList(v => !v)}
                className="text-xs font-semibold text-orange-300 hover:text-orange-200">
                {showList ? '▾' : '▸'} From {last.evidence.total} record{last.evidence.total === 1 ? '' : 's'} — {showList ? 'hide' : 'view'} list
              </button>
              {showList && (
                <div className="mt-2 overflow-x-auto">
                  <p className="text-[11px] text-slate-500 mb-1">{last.evidence.label}{last.evidence.total > last.evidence.rows.length ? ` · first ${last.evidence.rows.length}` : ''}</p>
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-slate-400 text-left">
                        <th className="py-1 pr-3 font-semibold">Name</th>
                        {last.evidence.columns.map(c => <th key={c} className="py-1 pr-3 font-semibold capitalize">{c.replace(/_/g, ' ')}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {last.evidence.rows.map((r, i) => (
                        <tr key={i} className="border-t border-white/5">
                          <td className="py-1 pr-3">
                            {Number(r.id) > 0
                              ? <button type="button" onClick={() => navigate(`/members/${r.id}`)} className="text-orange-200 hover:underline text-left">{r.name}</button>
                              : <span>{r.name}</span>}
                          </td>
                          {last.evidence!.columns.map(c => <td key={c} className="py-1 pr-3 text-slate-300 whitespace-nowrap">{r[c] ?? '—'}</td>)}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
          <p className="mt-3 text-[10px] text-slate-500">AI answer from your live gym data — check the list for anything important.</p>
        </div>
      )}
    </div>
  )
}
