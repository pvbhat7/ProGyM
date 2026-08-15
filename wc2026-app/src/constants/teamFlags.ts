// FIFA 3-letter team code -> ISO 3166-1 alpha-2 (with -subdivision for UK home nations).
// Used to build flag CDN URLs from team short_code without a DB migration.
//
// Source CDN: https://flagcdn.com (free, no API key, supports w20/w40/w80/w160/w320 PNG + .svg)
//   Example: https://flagcdn.com/w80/br.png   -> Brazil
//            https://flagcdn.com/w80/gb-eng.png -> England

export const FIFA_TO_ISO: Record<string, string> = {
  // Group A
  MEX: 'mx', KOR: 'kr', CZE: 'cz', RSA: 'za',
  // Group B
  CAN: 'ca', BIH: 'ba', QAT: 'qa', SUI: 'ch',
  // Group C
  BRA: 'br', MAR: 'ma', HAI: 'ht', SCO: 'gb-sct',
  // Group D
  USA: 'us', PAR: 'py', AUS: 'au', TUR: 'tr',
  // Group E
  GER: 'de', CUW: 'cw', CIV: 'ci', ECU: 'ec',
  // Group F
  NED: 'nl', JPN: 'jp', SWE: 'se', TUN: 'tn',
  // Group G
  BEL: 'be', EGY: 'eg', IRN: 'ir', NZL: 'nz',
  // Group H
  ESP: 'es', CPV: 'cv', KSA: 'sa', URU: 'uy',
  // Group I
  FRA: 'fr', SEN: 'sn', IRQ: 'iq', NOR: 'no',
  // Group J
  ARG: 'ar', ALG: 'dz', AUT: 'at', JOR: 'jo',
  // Group K
  POR: 'pt', COD: 'cd', UZB: 'uz', COL: 'co',
  // Group L
  ENG: 'gb-eng', CRO: 'hr', GHA: 'gh', PAN: 'pa',
}

export type FlagSize = 20 | 40 | 80 | 160 | 320

export function flagUrl(shortCode: string | null | undefined, size: FlagSize = 40): string | null {
  if (!shortCode) return null
  const iso = FIFA_TO_ISO[shortCode.toUpperCase()]
  if (!iso) return null
  return `https://flagcdn.com/w${size}/${iso}.png`
}
