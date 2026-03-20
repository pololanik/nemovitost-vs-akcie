import type { Config } from './types';

// Short keys: max 2-3 chars, human-readable Czech abbreviations
const KEY_MAP: Record<keyof Config, string> = {
  propertyPrice: 'cn',     // cena nemovitosti
  mortgageRate: 'ur',      // úrok
  mortgageTerm: 'ds',      // doba splácení
  propertyGrowthRate: 'rn', // růst nemovitosti
  monthlyRent: 'nj',       // nájem
  rentGrowthRate: 'rp',    // růst pronájmu
  vacancyMonths: 'pm',     // prázdné měsíce
  maintenanceFund: 'fo',   // fond oprav
  maintenanceGrowthRate: 'rf', // růst fondu
  insuranceYearly: 'pj',   // pojištění
  propertyTax: 'dn',       // daň z nemovitosti
  stockReturnRate: 'va',   // výnos akcií
  years: 'h',              // horizont
};

const REVERSE_KEY_MAP: Record<string, keyof Config> = {};
for (const [k, v] of Object.entries(KEY_MAP)) {
  REVERSE_KEY_MAP[v] = k as keyof Config;
}

/**
 * Compact number encoding:
 *   4000000  → "4M"
 *   4500000  → "4M5"  (4.5M)
 *   12000    → "12K"
 *   2500     → "2K5"  (2.5K)
 *   1500     → "1K5"
 *   150      → "150"
 *   5.5      → "5.5"
 *   0        → "0"
 */
function encodeNumber(n: number): string {
  if (n === 0) return '0';

  // Millions
  if (Math.abs(n) >= 1_000_000 && n % 100_000 === 0) {
    const millions = Math.floor(n / 1_000_000);
    const remainder = Math.round((n % 1_000_000) / 100_000);
    if (remainder === 0) return `${millions}M`;
    return `${millions}M${remainder}`;
  }

  // Thousands
  if (Math.abs(n) >= 1000 && n % 100 === 0) {
    const thousands = Math.floor(n / 1000);
    const remainder = Math.round((n % 1000) / 100);
    if (remainder === 0) return `${thousands}K`;
    return `${thousands}K${remainder}`;
  }

  // Small numbers / decimals — just use the number as-is
  // Remove trailing zeros after decimal
  return String(n).replace(/\.?0+$/, '') || '0';
}

/**
 * Decode compact number: "4M" → 4000000, "2K5" → 2500, "5.5" → 5.5
 */
function decodeNumber(s: string): number {
  s = s.trim();

  // Millions: "4M", "4M5"
  const mMatch = s.match(/^(-?\d+)M(\d?)$/i);
  if (mMatch) {
    const base = parseInt(mMatch[1]) * 1_000_000;
    const frac = mMatch[2] ? parseInt(mMatch[2]) * 100_000 : 0;
    return base + frac;
  }

  // Thousands: "12K", "2K5"
  const kMatch = s.match(/^(-?\d+)K(\d?)$/i);
  if (kMatch) {
    const base = parseInt(kMatch[1]) * 1_000;
    const frac = kMatch[2] ? parseInt(kMatch[2]) * 100 : 0;
    return base + frac;
  }

  // Plain number
  return parseFloat(s);
}

/**
 * Encode config to compact URL query string.
 * Only includes values that differ from defaults.
 */
export function configToQuery(config: Config, defaults: Config): string {
  const params: string[] = [];

  for (const key of Object.keys(KEY_MAP) as (keyof Config)[]) {
    if (config[key] !== defaults[key]) {
      params.push(`${KEY_MAP[key]}=${encodeNumber(config[key])}`);
    }
  }

  return params.length > 0 ? params.join('&') : '';
}

/**
 * Decode URL query string back to partial config, merged with defaults.
 */
export function queryToConfig(query: string, defaults: Config): Config {
  const config = { ...defaults };
  if (!query) return config;

  const clean = query.startsWith('?') ? query.slice(1) : query;
  const pairs = clean.split('&');

  for (const pair of pairs) {
    const [shortKey, value] = pair.split('=');
    if (!shortKey || !value) continue;

    const configKey = REVERSE_KEY_MAP[shortKey];
    if (configKey) {
      config[configKey] = decodeNumber(value);
    }
  }

  return config;
}

/**
 * Build full shareable URL.
 */
export function buildShareUrl(config: Config, defaults: Config): string {
  const query = configToQuery(config, defaults);
  const base = window.location.origin + window.location.pathname;
  return query ? `${base}?${query}` : base;
}
