export const eur = (n: number, digits = 0) =>
  (n < 0 ? '−€' : '€') + Math.abs(n).toLocaleString('en-GB', { minimumFractionDigits: digits, maximumFractionDigits: digits });

export const eurShort = (n: number) => {
  const a = Math.abs(n);
  const sign = n < 0 ? '−' : '';
  if (a >= 1_000_000) return sign + '€' + (a / 1_000_000).toLocaleString('en-GB', { maximumFractionDigits: 1 }) + 'm';
  if (a >= 1_000) return sign + '€' + Math.round(a / 1_000).toLocaleString('en-GB') + 'k';
  return eur(n);
};

export const pct = (f: number, digits = 1) => (f * 100).toFixed(digits) + '%';

export const fmtDate = (iso: string) =>
  new Date(iso + 'T00:00:00Z').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });

export const daysBetween = (fromIso: string, toIso: string) =>
  Math.round((Date.parse(toIso + 'T00:00:00Z') - Date.parse(fromIso + 'T00:00:00Z')) / 86_400_000);

export const addDays = (iso: string, days: number) => {
  const d = new Date(iso + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
};

/** Timestamp on the simulated clock: demo date + real time of day (the demo always happens on SIM_TODAY). */
export const simStamp = (iso: string, simDay: string) =>
  `${fmtDate(simDay)}, ${new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`;
