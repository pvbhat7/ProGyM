import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { API_BASE } from '../api/config'
import { getSession } from '../services/wcSession'
import { toast } from './Toast'

const STORAGE_KEY = 'wc_bonanza_modal_last_shown_at'
const COOLDOWN_MS = 4 * 60 * 60 * 1000  // 4 hours

interface ReferralInfo {
  referral_code: string | null
  share_link: string
  coins_per_referral: number
  credited: number
  pending: number
}

interface Props {
  // M101 kickoff in "YYYY-MM-DD HH:MM:SS" IST. Once SF1 has kicked off,
  // a different banner takes over and we stop nagging.
  m101KickoffIst?: string | null
}

type Lang = 'mr' | 'en'

const CONTENT: Record<Lang, {
  newBadge: string
  limited: string
  title: string
  subtitle: string
  whyTitle: string
  whyBody: React.ReactNode
  rankingTitle: string
  rankingBullets: React.ReactNode[]
  pointsTitle: string
  pointsRows: { label: React.ReactNode; pts: string }[]
  maxPerMatch: string
  maxPerMatchVal: string
  bonusLabel: React.ReactNode
  maxTotal: React.ReactNode
  tieTitle: string
  tieBody: React.ReactNode
  rewardTitle: string
  rewardBody: string
  lockNote: string
  laterCta: string
  openCta: string
  referTitle: string
  referBlurb: React.ReactNode
  referCodeLabel: string
  referCopy: string
  referCopied: string
  referShare: string
  referSignupHint: string
}> = {
  mr: {
    newBadge:    'नवीन कॉन्टेस्ट',
    limited:     'मर्यादित कालावधी',
    title:       'Knockout Bonanza',
    subtitle:    'Top 3 ला विशेष सन्मान. फक्त शेवटच्या 4 सामन्यांसाठी.',
    whyTitle:    'हा कॉन्टेस्ट का?',
    whyBody:     (
      <>
        Group stage नंतर बरेच players slow झाले आहेत. Regular leaderboard वर मागे पडलात?
        घाबरू नका — <b className="text-gray-900">Knockout Bonanza ही नवीन सुरुवात आहे.</b> फक्त शेवटच्या 4 सामन्यांसाठी —
        <b> Semi-finals, Third Place, आणि Final.</b> सर्वजण <b>zero पासून</b> सुरुवात करतात.
        आधीची performance काहीही फरक पडत नाही. कुणीही top 3 मध्ये येऊ शकतो.
      </>
    ),
    rankingTitle: 'वेगळी रँकिंग',
    rankingBullets: [
      <>Bonanza ची <b>स्वतःची leaderboard</b> आहे — तुमच्या नेहमीच्या Football Coins रँकिंगपासून पूर्णपणे वेगळी.</>,
      <>तुमच्या <b>नेहमीच्या predictions आणि coins</b> चालू राहतील. त्यात काहीही बदल नाही.</>,
      <>Bonanza ची rank <b>फक्त ह्या 4 सामन्यांवर</b> ठरते. प्रश्न मात्र जास्त कठीण — मोठ्या reward साठी मोठी मेहनत.</>,
    ],
    pointsTitle: 'गुण पद्धत (प्रति सामना)',
    pointsRows: [
      { label: <>Winner <span className="text-gray-400 text-[10px]">(पुढे जाणारी टीम)</span></>, pts: '+5'  },
      { label: <>Exact score <span className="text-gray-400 text-[10px]">(FT+ET, penalty वगळून)</span></>, pts: '+30' },
      { label: <>पहिला गोलकर्ता</>, pts: '+25' },
      { label: <>Player of the Match</>, pts: '+20' },
    ],
    maxPerMatch:    'Max प्रति सामना',
    maxPerMatchVal: '80 गुण',
    bonusLabel:     (<><span className="font-black">🎖 Perfect Bracket bonus:</span> सर्व 4 सामन्यांचे winner बरोबर predict केल्यास → <b className="text-amber-700">+30 बोनस गुण</b></>),
    maxTotal:       (<>एकूण जास्तीत जास्त: <b className="text-purple-700">350 गुण</b> (4 × 80 + 30 बोनस)</>),
    tieTitle:       'टायब्रेकर',
    tieBody:        (<>
      दोघांचे गुण समान झाले? तर <b>4 सामन्यांत एकूण किती गोल होतील</b> ह्याचा सर्वात जवळचा अंदाज जिंकतो.
      Bonanza पेजवर तुमचा अंदाज सादर करा — SF1 lock होण्याच्या 15 मिनिटे आधीपर्यंत बदलू शकता.
    </>),
    rewardTitle:    'Top 3 ला विशेष सन्मान',
    rewardBody:     'Final संपल्यानंतर top 3 ची नावे announce केली जातील. आधीची activity आवश्यक नाही — साइन अप केलेला कुणीही top 3 मध्ये येऊ शकतो.',
    lockNote:       'प्रति सामना predictions — kickoff च्या 24 तास आधी सुरू · 15 मिनिटे आधी lock.',
    laterCta:       'नंतर पाहीन',
    openCta:        'Bonanza उघडा →',
    referTitle:     'मित्रांना सहभागी करा',
    referBlurb:     (<>तुमची link share करा. जास्त मित्रांना सहभागी केल्यास <b>Top referrers</b> ची नावे leaderboard वर झळकतात 🏆</>),
    referCodeLabel: 'तुमचा referral कोड',
    referCopy:      'लिंक कॉपी करा',
    referCopied:    'कॉपी झाले ✓',
    referShare:     'Share करा',
    referSignupHint:'Refer-and-earn साठी आधी sign up करा',
  },
  en: {
    newBadge:    'New Contest',
    limited:     'Limited Time',
    title:       'Knockout Bonanza',
    subtitle:    'Top 3 get special recognition. Last 4 matches only.',
    whyTitle:    'Why this contest?',
    whyBody:     (
      <>
        We've noticed many players slowed down after the group stage. Behind on the regular leaderboard?
        <b className="text-gray-900"> Knockout Bonanza is a fresh start.</b> A brand-new contest scoped to just the
        final 4 matches — <b>Semi-finals, Third Place, and the Final.</b> Everyone begins at <b>zero points</b>.
        Past performance doesn't matter. Anyone can finish in the top 3.
      </>
    ),
    rankingTitle: 'Separate ranking',
    rankingBullets: [
      <>Bonanza has its <b>own leaderboard</b> — completely independent from your regular Football Coins ranking.</>,
      <>Your <b>normal predictions</b> on every match continue as usual. Nothing changes there.</>,
      <>Bonanza rank is decided <b>only by these 4 matches</b>. Harder questions for bigger glory.</>,
    ],
    pointsTitle: 'Point system (per match)',
    pointsRows: [
      { label: <>Winner <span className="text-gray-400 text-[10px]">(team that advances)</span></>, pts: '+5'  },
      { label: <>Exact score <span className="text-gray-400 text-[10px]">(FT+ET, no penalties)</span></>, pts: '+30' },
      { label: <>First goalscorer</>, pts: '+25' },
      { label: <>Player of the Match</>, pts: '+20' },
    ],
    maxPerMatch:    'Max per match',
    maxPerMatchVal: '80 pts',
    bonusLabel:     (<><span className="font-black">🎖 Perfect Bracket bonus:</span> predict the winner correctly in <b>all 4 matches</b> → <b className="text-amber-700">+30 bonus pts</b></>),
    maxTotal:       (<>Maximum possible total: <b className="text-purple-700">350 pts</b> (4 × 80 + 30 bonus)</>),
    tieTitle:       'Tiebreaker',
    tieBody:        (<>
      Two players on the same total? The <b>closest guess</b> on <i>total goals across all 4 matches</i> wins.
      Submit your number on the Bonanza page — editable until SF1 locks 15 min before kickoff.
    </>),
    rewardTitle:    'Top 3 get Special Recognition',
    rewardBody:     'The top 3 names will be featured after the Final. Anyone signed up can finish in the top 3 — no minimum prior activity needed.',
    lockNote:       'Predictions per match: open 24h before kickoff · lock 15 min before kickoff.',
    laterCta:       'Maybe later',
    openCta:        'Open Bonanza →',
    referTitle:     'Invite friends to the contest',
    referBlurb:     (<>Share your link to bring more players in. The more friends you bring, the higher <b>top referrers</b> climb on the leaderboard 🏆</>),
    referCodeLabel: 'Your referral code',
    referCopy:      'Copy link',
    referCopied:    'Copied ✓',
    referShare:     'Share',
    referSignupHint:'Sign up to get your refer-and-earn link',
  },
}

function kickoffMs(dt: string): number | null {
  const m = dt.match(/^(\d{4})-(\d{2})-(\d{2})\s(\d{2}):(\d{2}):?(\d{2})?/)
  if (!m) return null
  const utc = Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +(m[6] || 0))
  return utc - 5.5 * 3600 * 1000
}
function shouldShow(m101KickoffIst?: string | null): boolean {
  if (m101KickoffIst) {
    const t = kickoffMs(m101KickoffIst)
    if (t !== null && Date.now() >= t) return false
  }
  try {
    const last = parseInt(localStorage.getItem(STORAGE_KEY) || '0', 10)
    if (last && Date.now() - last < COOLDOWN_MS) return false
  } catch { /* ignore */ }
  return true
}
function markShown() {
  try { localStorage.setItem(STORAGE_KEY, String(Date.now())) } catch {}
}

export default function BonanzaPromoModal({ m101KickoffIst }: Props) {
  const navigate = useNavigate()
  const [open, setOpen]       = useState(false)
  const [lang, setLang]       = useState<Lang>('mr')
  const [referral, setReferral] = useState<ReferralInfo | null>(null)
  const session = getSession()

  useEffect(() => {
    if (shouldShow(m101KickoffIst)) setOpen(true)
  }, [m101KickoffIst])

  // Fetch referral info only when modal is opened by a signed-in user.
  useEffect(() => {
    if (!open || !session?.clientId || referral) return
    fetch(`${API_BASE}/wc_referrals/info.php?client_id=${session.clientId}`)
      .then(r => r.ok ? r.json() : null)
      .then((j: ReferralInfo | null) => { if (j && j.referral_code) setReferral(j) })
      .catch(() => {})
  }, [open, session?.clientId, referral])

  function close() { markShown(); setOpen(false) }
  function goPredict() { markShown(); setOpen(false); navigate('/knockout-bonanza') }

  function buildShareText(): string {
    if (!referral) return ''
    const name = session?.name?.trim() || 'I'
    return [
      '🏆 Join me on ProGym World Cup 2026!',
      'Predict matches and climb the leaderboard.',
      '',
      `Use my referral code: ${referral.referral_code}`,
      referral.share_link,
      '',
      `— ${name}`,
    ].join('\n')
  }
  async function shareReferral() {
    if (!referral) return
    const text = buildShareText()
    if (navigator.share) {
      try { await navigator.share({ title: 'ProGym World Cup 2026', text, url: referral.share_link }); return }
      catch { /* user cancelled */ }
    }
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener')
  }
  function copyShareLink() {
    if (!referral) return
    navigator.clipboard?.writeText(referral.share_link).then(
      () => toast(CONTENT[lang].referCopied),
      () => toast(referral.share_link),
    )
  }

  if (!open) return null
  const c = CONTENT[lang]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm wc-bnz-fadeIn px-3 py-8"
         style={{ paddingTop: 'max(2rem, env(safe-area-inset-top))', paddingBottom: 'max(2rem, env(safe-area-inset-bottom))' }}
         onClick={close}
         role="dialog" aria-modal="true" aria-labelledby="bonanza-modal-title">
      <div
        onClick={e => e.stopPropagation()}
        className="w-full max-w-md max-h-[85vh] overflow-y-auto rounded-3xl bg-white shadow-2xl ring-1 ring-black/5 wc-bnz-slideUp"
      >
        {/* Hero */}
        <div className="relative overflow-hidden bg-gradient-to-br from-purple-700 via-fuchsia-600 to-rose-500 text-white px-5 pt-5 pb-6">
          {/* Top row: language toggle + close */}
          <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
            <div className="inline-flex rounded-full bg-white/15 backdrop-blur-sm p-0.5 text-[10px] font-black uppercase tracking-wider">
              <button
                onClick={() => setLang('mr')}
                className={`px-2.5 py-1 rounded-full transition-colors ${lang === 'mr' ? 'bg-white text-purple-700' : 'text-white/85 hover:text-white'}`}
                aria-pressed={lang === 'mr'}
              >मराठी</button>
              <button
                onClick={() => setLang('en')}
                className={`px-2.5 py-1 rounded-full transition-colors ${lang === 'en' ? 'bg-white text-purple-700' : 'text-white/85 hover:text-white'}`}
                aria-pressed={lang === 'en'}
              >English</button>
            </div>
            <button
              onClick={close}
              aria-label="Close"
              className="w-8 h-8 inline-flex items-center justify-center rounded-full bg-white/15 hover:bg-white/25 text-white text-base font-bold transition-colors"
            >✕</button>
          </div>

          <div className="pointer-events-none absolute -top-12 -right-12 w-40 h-40 bg-white/15 rounded-full blur-2xl" />
          <div className="pointer-events-none absolute -bottom-16 -left-16 w-48 h-48 bg-pink-300/20 rounded-full blur-2xl" />
          <div className="relative mt-9">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[10px] uppercase tracking-[0.18em] font-black bg-white/25 px-1.5 py-0.5 rounded">{c.newBadge}</span>
              <span className="text-[10px] uppercase tracking-wider font-bold text-purple-100">{c.limited}</span>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-4xl drop-shadow">💎</span>
              <div>
                <h2 id="bonanza-modal-title" className="text-2xl font-black leading-tight">{c.title}</h2>
                <p className="text-purple-100 text-[12px] mt-1 leading-snug">{c.subtitle}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="px-5 py-4 space-y-4 text-sm text-gray-700">
          {/* Why */}
          <section>
            <div className="flex items-center gap-2 mb-1.5">
              <span>💡</span>
              <h3 className="font-black text-[13px] text-purple-900 uppercase tracking-wide">{c.whyTitle}</h3>
            </div>
            <p className="text-[13px] leading-relaxed">{c.whyBody}</p>
          </section>

          <hr className="border-purple-100" />

          {/* Separate Ranking */}
          <section>
            <div className="flex items-center gap-2 mb-1.5">
              <span>🏆</span>
              <h3 className="font-black text-[13px] text-purple-900 uppercase tracking-wide">{c.rankingTitle}</h3>
            </div>
            <ul className="space-y-1.5 text-[12.5px] leading-relaxed">
              {c.rankingBullets.map((bullet, i) => (
                <li key={i} className="flex gap-2"><span className="text-purple-500 mt-0.5">•</span><span>{bullet}</span></li>
              ))}
            </ul>
          </section>

          <hr className="border-purple-100" />

          {/* Point System */}
          <section>
            <div className="flex items-center gap-2 mb-2">
              <span>🎯</span>
              <h3 className="font-black text-[13px] text-purple-900 uppercase tracking-wide">{c.pointsTitle}</h3>
            </div>
            <div className="rounded-xl border border-purple-100 overflow-hidden">
              <table className="w-full text-[12.5px]">
                <tbody>
                  {c.pointsRows.map((r, i) => (
                    <tr key={i} className={i % 2 === 0 ? 'bg-purple-50/50' : ''}>
                      <td className="px-3 py-2">{r.label}</td>
                      <td className="px-3 py-2 text-right font-black text-purple-700 tabular-nums">{r.pts}</td>
                    </tr>
                  ))}
                  <tr className="bg-purple-100/70 border-t-2 border-purple-200">
                    <td className="px-3 py-2 font-bold text-purple-900">{c.maxPerMatch}</td>
                    <td className="px-3 py-2 text-right font-black text-purple-900 tabular-nums">{c.maxPerMatchVal}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="mt-3 rounded-xl bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-200 px-3 py-2">
              <p className="text-[12px] text-amber-900">{c.bonusLabel}</p>
            </div>

            <p className="text-[12px] text-gray-600 mt-2 text-center">{c.maxTotal}</p>
          </section>

          <hr className="border-purple-100" />

          {/* Tiebreaker */}
          <section>
            <div className="flex items-center gap-2 mb-1.5">
              <span>⚖️</span>
              <h3 className="font-black text-[13px] text-purple-900 uppercase tracking-wide">{c.tieTitle}</h3>
            </div>
            <p className="text-[12.5px] leading-relaxed">{c.tieBody}</p>
          </section>

          <hr className="border-purple-100" />

          {/* Reward */}
          <section className="rounded-xl bg-gradient-to-br from-purple-50 to-rose-50 border border-purple-200 p-3">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-lg">🥇🥈🥉</span>
              <h3 className="font-black text-[13px] text-purple-900">{c.rewardTitle}</h3>
            </div>
            <p className="text-[12px] text-purple-800/80">{c.rewardBody}</p>
          </section>

          <hr className="border-purple-100" />

          {/* Refer & Earn */}
          <section className="rounded-xl bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200 p-3">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-lg">🎁</span>
              <h3 className="font-black text-[13px] text-emerald-900">{c.referTitle}</h3>
            </div>
            <p className="text-[12px] text-emerald-900/85 leading-relaxed mb-3">{c.referBlurb}</p>

            {session && referral && referral.referral_code ? (
              <>
                {/* Code chip */}
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[10px] uppercase tracking-wider font-bold text-emerald-700/80">{c.referCodeLabel}:</span>
                  <span className="font-black text-emerald-900 text-base tabular-nums tracking-widest">{referral.referral_code}</span>
                </div>
                {/* Share link box */}
                <div className="flex items-stretch gap-1.5 mb-2">
                  <div className="flex-1 min-w-0 rounded-lg bg-white border border-emerald-200 px-2.5 py-1.5 text-[11px] text-emerald-900 truncate font-mono" title={referral.share_link}>
                    {referral.share_link}
                  </div>
                  <button
                    onClick={copyShareLink}
                    className="px-3 py-1.5 rounded-lg bg-white border border-emerald-300 text-emerald-700 text-[11px] font-bold hover:bg-emerald-50 transition-colors flex-shrink-0"
                  >{c.referCopy}</button>
                </div>
                {/* Share CTA */}
                <button
                  onClick={shareReferral}
                  className="w-full px-3 py-2 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-[12px] font-black shadow-sm active:scale-[0.99] transition-transform"
                >
                  📤 {c.referShare}
                </button>
              </>
            ) : !session ? (
              <button
                onClick={() => { markShown(); setOpen(false); navigate('/signup') }}
                className="w-full px-3 py-2 rounded-lg bg-white border border-emerald-300 text-emerald-700 text-[12px] font-bold"
              >{c.referSignupHint} →</button>
            ) : (
              <p className="text-[11px] text-emerald-700/70">Loading your link…</p>
            )}
          </section>

          <p className="text-[10.5px] text-gray-400 text-center pt-1">{c.lockNote}</p>
        </div>

        {/* Footer / CTAs */}
        <div className="sticky bottom-0 bg-white border-t border-gray-100 px-5 py-3 flex items-center gap-2">
          <button onClick={close} className="px-3 py-2.5 text-[13px] text-gray-500 font-semibold hover:text-gray-700 transition-colors">
            {c.laterCta}
          </button>
          <button onClick={goPredict} className="flex-1 px-4 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white font-black text-sm shadow-md active:scale-[0.99] transition-transform">
            {c.openCta}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes _wc_bnz_fadeIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes _wc_bnz_slideUp { from { transform: translateY(20px); opacity: 0 } to { transform: translateY(0); opacity: 1 } }
        .wc-bnz-fadeIn  { animation: _wc_bnz_fadeIn  .18s ease-out both }
        .wc-bnz-slideUp { animation: _wc_bnz_slideUp .25s cubic-bezier(.2,.8,.2,1) both }
      `}</style>
    </div>
  )
}
