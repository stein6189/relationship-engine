import type { Fact } from '../types';

export interface FoundNumber {
  raw: string;
  value: number;
  kind: 'pct' | 'money' | 'multiple' | 'year' | 'plain';
  index: number;
}

const MONTHS = /^(\s*)(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/i;

/** Extract numbers that carry meaning. Ignores small bare counts (≤10), day-of-month before a month name,
 *  and compound words such as "3-month" or "Q4". */
export function extractNumbers(text: string): FoundNumber[] {
  const re = /([+-]?)(€\s?)?(\d{1,3}(?:,\d{3})+|\d+)(\.\d+)?(?:\s?((?:k|m|bn)(?![a-z])|%|×|x(?![a-z])))?/gi;
  const out: FoundNumber[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    const [raw, sign, euro, intPart, dec, suffixRaw] = m;
    const before = text[m.index - 1] ?? '';
    const after = text.slice(m.index + raw.length);
    if (/[A-Za-z]/.test(before)) continue; // Q4, V5, mbo5
    if (/^-[a-z]/i.test(after)) continue; // 3-month, 10-year
    const suffix = (suffixRaw ?? '').toLowerCase();
    let value = parseFloat(intPart.replace(/,/g, '') + (dec ?? ''));
    if (sign === '-') value = -value;
    if (suffix === 'k') value *= 1_000;
    if (suffix === 'm') value *= 1_000_000;
    if (suffix === 'bn') value *= 1_000_000_000;
    let kind: FoundNumber['kind'] = 'plain';
    if (suffix === '%') kind = 'pct';
    else if (suffix === '×' || suffix === 'x') kind = 'multiple';
    else if (euro || suffix === 'k' || suffix === 'm' || suffix === 'bn') kind = 'money';
    else if (!dec && value >= 1900 && value <= 2100) kind = 'year';
    if (kind === 'plain') {
      if (Math.abs(value) <= 31 && MONTHS.test(after)) continue; // "1 Dec"
      if (Math.abs(value) <= 10 && !dec) continue; // small counts
    }
    out.push({ raw: raw.trim(), value, kind, index: m.index });
  }
  return out;
}

function allowedValues(facts: Fact[]) {
  const vals: number[] = [];
  for (const f of facts) for (const n of extractNumbers(String(f.value))) vals.push(Math.abs(n.value));
  return vals;
}

function matches(v: number, allowed: number[]) {
  const a = Math.abs(v);
  return allowed.some((x) => {
    if (x === a) return true;
    if (x === 0) return false;
    // tolerate common roundings: €110k for 110,000; €1.1m for 1,100,000; 6.7% vs 6.67%
    const rel = Math.abs(x - a) / x;
    return rel < 0.05 && (String(a).length < String(x).length || Math.abs(x - a) < 0.06);
  });
}

export interface GuardResult {
  pass: boolean;
  unsupported: FoundNumber[];
  checked: number;
}

export function numberGuard(text: string, facts: Fact[]): GuardResult {
  const allowed = allowedValues(facts);
  const found = extractNumbers(text);
  const unsupported = found.filter((n) => !matches(n.value, allowed));
  return { pass: unsupported.length === 0, unsupported, checked: found.length };
}
