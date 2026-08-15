// Parses raw wikitext of "2026 FIFA World Cup squads" and emits SQL INSERTs
// for the wc_players table. Run with:  node parse_wc_squads.js

const fs = require('fs');
const path = require('path');

const SRC = path.join(__dirname, 'wc_squads_raw.txt');
const OUT = path.join(__dirname, 'wc_seed_players.sql');

const raw = fs.readFileSync(SRC, 'utf8');

// Wikipedia country name -> our short_code (must match wc_seed_teams.sql)
const countryToCode = {
    'Czech Republic': 'CZE',
    'Mexico': 'MEX',
    'South Africa': 'RSA',
    'South Korea': 'KOR',
    'Canada': 'CAN',
    'Bosnia and Herzegovina': 'BIH',
    'Qatar': 'QAT',
    'Switzerland': 'SUI',
    'Brazil': 'BRA',
    'Morocco': 'MAR',
    'Haiti': 'HAI',
    'Scotland': 'SCO',
    'United States': 'USA',
    'Paraguay': 'PAR',
    'Australia': 'AUS',
    'Turkey': 'TUR',
    'Türkiye': 'TUR',
    'Germany': 'GER',
    'Curaçao': 'CUW',
    'Ivory Coast': 'CIV',
    "Côte d'Ivoire": 'CIV',
    'Ecuador': 'ECU',
    'Netherlands': 'NED',
    'Japan': 'JPN',
    'Sweden': 'SWE',
    'Tunisia': 'TUN',
    'Belgium': 'BEL',
    'Egypt': 'EGY',
    'Iran': 'IRN',
    'New Zealand': 'NZL',
    'Spain': 'ESP',
    'Cape Verde': 'CPV',
    'Cabo Verde': 'CPV',
    'Saudi Arabia': 'KSA',
    'Uruguay': 'URU',
    'France': 'FRA',
    'Senegal': 'SEN',
    'Iraq': 'IRQ',
    'Norway': 'NOR',
    'Argentina': 'ARG',
    'Algeria': 'ALG',
    'Austria': 'AUT',
    'Jordan': 'JOR',
    'Portugal': 'POR',
    'DR Congo': 'COD',
    'Uzbekistan': 'UZB',
    'Colombia': 'COL',
    'England': 'ENG',
    'Croatia': 'CRO',
    'Ghana': 'GHA',
    'Panama': 'PAN',
};

// Wikitext position abbreviations -> our codes
const posMap = { GK: 'GK', DF: 'DEF', MF: 'MID', FW: 'FWD' };

const lines = raw.split('\n');
let currentCountry = null;
let currentCode = null;
const players = []; // { code, no, pos, name }
const unknownCountries = new Set();

for (const line of lines) {
    // Country header e.g. "===Brazil==="
    const countryMatch = line.match(/^===\s*([^=]+?)\s*===\s*$/);
    if (countryMatch) {
        currentCountry = countryMatch[1].trim();
        currentCode = countryToCode[currentCountry] || null;
        if (!currentCode) unknownCountries.add(currentCountry);
        continue;
    }

    // Player template e.g. "{{nat fs g player|no=10|pos=FW|name=[[Patrik Schick]]|..."
    if (!currentCode) continue;
    const playerMatch = line.match(/\{\{nat fs g player\|/);
    if (!playerMatch) continue;

    const noMatch   = line.match(/\|no=(\d+)/);
    const posMatch  = line.match(/\|pos=([A-Z]{2})/);
    const nameMatch = line.match(/\|name=\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/);

    if (!nameMatch) continue;
    // [[Real Name|Display Name]] -> use display name (after |)
    const name = (nameMatch[2] || nameMatch[1]).trim();
    const no   = noMatch ? parseInt(noMatch[1], 10) : null;
    const pos  = posMatch ? (posMap[posMatch[1]] || null) : null;

    players.push({ code: currentCode, no, pos, name });
}

// Group counts for verification
const counts = {};
for (const p of players) counts[p.code] = (counts[p.code] || 0) + 1;

// Generate SQL
const esc = (s) => "'" + String(s).replace(/'/g, "''") + "'";

const sqlLines = [];
sqlLines.push('-- =====================================================================');
sqlLines.push('-- FIFA World Cup 2026 — Players Seed');
sqlLines.push('-- Auto-generated from Wikipedia "2026 FIFA World Cup squads" (raw wikitext)');
sqlLines.push('-- Run on Hostinger phpMyAdmin AFTER wc_seed_teams.sql has been executed.');
sqlLines.push('-- Safe to re-run: uses INSERT IGNORE.');
sqlLines.push('-- =====================================================================');
sqlLines.push('');
sqlLines.push('INSERT IGNORE INTO `wc_players` (`team_id`, `name`, `position`, `jersey_number`, `discontinue`)');
sqlLines.push('SELECT t.id, p.name, p.position, p.jersey_number, \'false\'');
sqlLines.push('FROM (');

const rowSqls = players.map((p, i) => {
    const noVal  = p.no != null && !isNaN(p.no) ? p.no : 'NULL';
    const posVal = p.pos ? esc(p.pos) : 'NULL';
    return `  SELECT ${esc(p.code)} AS short_code, ${esc(p.name)} AS name, ${posVal} AS position, ${noVal} AS jersey_number`;
});
sqlLines.push(rowSqls.join('\n  UNION ALL\n'));
sqlLines.push(') p');
sqlLines.push('JOIN `wc_teams` t ON t.short_code = p.short_code;');
sqlLines.push('');
sqlLines.push('-- =====================================================================');
sqlLines.push('-- VERIFY:');
sqlLines.push('--   SELECT COUNT(*) FROM wc_players;');
sqlLines.push('--   SELECT t.name, COUNT(p.id) c FROM wc_teams t');
sqlLines.push('--     LEFT JOIN wc_players p ON p.team_id=t.id GROUP BY t.id ORDER BY t.id;');
sqlLines.push('-- =====================================================================');

fs.writeFileSync(OUT, sqlLines.join('\n'));

// Report
console.log('Parsed players: ' + players.length);
console.log('Teams found: ' + Object.keys(counts).length);
const sortedCodes = Object.keys(counts).sort();
for (const c of sortedCodes) console.log('  ' + c + ': ' + counts[c]);
if (unknownCountries.size) {
    console.log('UNKNOWN COUNTRIES (not in mapping): ' + Array.from(unknownCountries).join(', '));
}
console.log('Wrote SQL to: ' + OUT);
