// Parses raw wikitext of 12 group pages and emits SQL INSERTs for wc_matches.
// Times in wikitext are local stadium time with an explicit UTC offset; we
// convert to IST (Asia/Calcutta, UTC+5:30) before storing because the rest of
// the project's timestamps are in IST.
//
// Run with:  node parse_wc_matches.js

const fs = require('fs');
const path = require('path');

const GROUPS = ['A','B','C','D','E','F','G','H','I','J','K','L'];
const OUT = path.join(__dirname, 'wc_seed_matches.sql');

// Wikipedia 3-letter code -> our wc_teams.short_code (matches the seed already loaded)
// Most match (KOR, MEX, etc.). Note ALG was the only one we needed an explicit override for.
const codeAlias = {
    // none required so far — wikipedia uses same codes as our seed
};

function readGroup(g) {
    return fs.readFileSync(path.join(__dirname, `wc_group_${g}_raw.txt`), 'utf8');
}

// Parse "1:00 p.m." or "12:00 p.m." or "8:00&nbsp;p.m." -> { h, m }
function parseClock(raw) {
    const s = raw.replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim().toLowerCase();
    // Capture h, m, am/pm
    const m = s.match(/^(\d{1,2}):(\d{2})\s*(a\.?m\.?|p\.?m\.?)/i);
    if (!m) return null;
    let h = parseInt(m[1], 10);
    const mn = parseInt(m[2], 10);
    const ampm = m[3].toLowerCase().replace(/\./g, '');
    if (ampm === 'pm' && h !== 12) h += 12;
    if (ampm === 'am' && h === 12) h = 0;
    return { h, m: mn };
}

// Parse "UTC−6" / "UTC−06:00" / "UTC-6" -> hours offset (e.g. -6)
function parseTzOffset(raw) {
    const s = raw.replace(/−/g, '-').replace(/&nbsp;/g, ' ');
    const m = s.match(/UTC\s*([+-])\s*(\d{1,2})(?::(\d{2}))?/);
    if (!m) return null;
    const sign = m[1] === '-' ? -1 : 1;
    const h = parseInt(m[2], 10);
    const mn = m[3] ? parseInt(m[3], 10) : 0;
    return sign * (h + mn / 60);
}

// Build a Date (UTC) from local Y/M/D + clock + utc offset (hours).
function buildUtcDate(y, mo, d, h, mn, offsetHours) {
    // local epoch ms assuming the local clock is at UTC offset = offsetHours.
    // utc_ms = Date.UTC(local) - offsetHours*3600*1000
    const utcMs = Date.UTC(y, mo - 1, d, h, mn) - offsetHours * 3600 * 1000;
    return new Date(utcMs);
}

// Format a Date (or any tz-aware instant) into IST 'YYYY-MM-DD HH:MM:SS'
function toIstString(date) {
    // IST = UTC+5:30
    const istMs = date.getTime() + 5.5 * 3600 * 1000;
    const d = new Date(istMs);
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ` +
           `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`;
}

// Pull all match blocks from a single group's wikitext.
function parseGroupMatches(group, text) {
    const matches = [];
    const sectionRe = /<section\s+begin\s*=\s*"?([A-Z])(\d)"?\s*\/>([\s\S]*?)<section\s+end/g;
    let m;
    while ((m = sectionRe.exec(text)) !== null) {
        const matchLabel = m[1] + m[2];   // e.g. "A3"
        const matchNum   = parseInt(m[2], 10);
        const body       = m[3];

        const dateM = body.match(/\|date=\{\{Start date\|(\d{4})\|(\d{1,2})\|(\d{1,2})\}\}/);
        const timeLineM = body.match(/\|time=([^\n|]+)/);
        const team1M = body.match(/\|team1=\{\{[^}]*\|([A-Z]{2,3})\}\}/);
        const team2M = body.match(/\|team2=\{\{[^}]*\|([A-Z]{2,3})\}\}/);
        const scoreM = body.match(/\|score=\{\{score link\|[^|]+\|([^}]+)\}\}/);

        if (!dateM || !timeLineM || !team1M || !team2M) continue;

        const y = parseInt(dateM[1], 10);
        const mo = parseInt(dateM[2], 10);
        const d = parseInt(dateM[3], 10);

        const tzOffset = parseTzOffset(timeLineM[1]);
        const clock    = parseClock(timeLineM[1]);
        if (tzOffset === null || !clock) continue;

        const utcInstant = buildUtcDate(y, mo, d, clock.h, clock.m, tzOffset);
        const kickoffIst = toIstString(utcInstant);

        // Detect whether score is a real result "2–0" / "2-0" or placeholder "Match 25"
        let status = 'upcoming';
        let scoreA = null, scoreB = null, winner = null;
        if (scoreM) {
            const sRaw = scoreM[1].trim();
            const sNorm = sRaw.replace(/–/g, '-'); // en-dash to hyphen
            const resM = sNorm.match(/^(\d+)\s*-\s*(\d+)$/);
            if (resM) {
                scoreA = parseInt(resM[1], 10);
                scoreB = parseInt(resM[2], 10);
                status = 'settled';
                winner = scoreA > scoreB ? 'A' : scoreA < scoreB ? 'B' : 'DRAW';
            }
        }

        const team1Code = (codeAlias[team1M[1]] || team1M[1]).toUpperCase();
        const team2Code = (codeAlias[team2M[1]] || team2M[1]).toUpperCase();

        matches.push({
            group,
            matchLabel,
            matchNum,
            team1: team1Code,
            team2: team2Code,
            kickoffIst,
            status,
            scoreA,
            scoreB,
            winner
        });
    }
    return matches;
}

// ---- MAIN ----
const all = [];
for (const g of GROUPS) {
    const text = readGroup(g);
    const ms = parseGroupMatches(g, text);
    if (ms.length !== 6) {
        console.warn(`WARN: Group ${g} parsed ${ms.length} matches (expected 6)`);
    }
    all.push(...ms);
}

console.log(`Parsed ${all.length} group-stage matches across ${GROUPS.length} groups.`);

// ---- EMIT SQL ----
const esc = (s) => s === null || s === undefined ? 'NULL' : "'" + String(s).replace(/'/g, "''") + "'";

const lines = [];
lines.push('-- =====================================================================');
lines.push('-- FIFA World Cup 2026 — Group Stage Schedule Seed (72 matches)');
lines.push('-- Auto-generated from Wikipedia "2026 FIFA World Cup Group X" pages.');
lines.push('-- Times converted from local stadium time to IST (Asia/Calcutta, UTC+5:30).');
lines.push('-- Safe to re-run: existing matches (same teams + kickoff) are skipped via UNIQUE-ish check.');
lines.push('-- =====================================================================');
lines.push('');
lines.push('INSERT INTO `wc_matches` (`team_a_id`, `team_b_id`, `stage`, `multiplier`, `kickoff_at`, `status`, `winner`, `score_a`, `score_b`, `discontinue`)');
lines.push('SELECT ta.id, tb.id, p.stage, p.multiplier, p.kickoff_at, p.status, p.winner, p.score_a, p.score_b, \'false\'');
lines.push('FROM (');

const rowSqls = all.map((m) => {
    return `  SELECT ${esc(m.team1)} AS code_a, ${esc(m.team2)} AS code_b, 'group' AS stage, 1 AS multiplier, ${esc(m.kickoffIst)} AS kickoff_at, ${esc(m.status)} AS status, ${esc(m.winner)} AS winner, ${m.scoreA === null ? 'NULL' : m.scoreA} AS score_a, ${m.scoreB === null ? 'NULL' : m.scoreB} AS score_b`;
});
lines.push(rowSqls.join('\n  UNION ALL\n'));
lines.push(') p');
lines.push('JOIN `wc_teams` ta ON ta.short_code = p.code_a');
lines.push('JOIN `wc_teams` tb ON tb.short_code = p.code_b');
lines.push('LEFT JOIN `wc_matches` existing');
lines.push('  ON existing.team_a_id = ta.id AND existing.team_b_id = tb.id AND existing.kickoff_at = p.kickoff_at');
lines.push('WHERE existing.id IS NULL;');
lines.push('');
lines.push('-- =====================================================================');
lines.push('-- VERIFY:');
lines.push('--   SELECT COUNT(*) FROM wc_matches;                              -- expect 72');
lines.push('--   SELECT status, COUNT(*) FROM wc_matches GROUP BY status;');
lines.push('--   SELECT m.kickoff_at, ta.short_code, tb.short_code, m.status, m.score_a, m.score_b');
lines.push('--     FROM wc_matches m');
lines.push('--     JOIN wc_teams ta ON ta.id=m.team_a_id');
lines.push('--     JOIN wc_teams tb ON tb.id=m.team_b_id');
lines.push('--     ORDER BY m.kickoff_at LIMIT 10;');
lines.push('-- =====================================================================');

fs.writeFileSync(OUT, lines.join('\n'));
console.log('Wrote:', OUT);

// Print a quick preview
console.log('\nFirst 5 matches:');
for (const m of all.slice(0, 5)) {
    console.log(`  ${m.group}${m.matchNum}  ${m.team1} vs ${m.team2}  ${m.kickoffIst} IST  status=${m.status}  score=${m.scoreA}-${m.scoreB}`);
}
console.log('\nStatus breakdown:');
const counts = {};
for (const m of all) counts[m.status] = (counts[m.status] || 0) + 1;
for (const k of Object.keys(counts)) console.log(`  ${k}: ${counts[k]}`);
