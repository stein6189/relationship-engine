import { exAnteCosts } from '@/lib/rules/costs';
import { eur, pct } from '@/lib/rules/format';
import { ALBERS_COMMITMENT } from '@/lib/facts';

/** Ex-ante cost disclosure — computed by code (RULES.md §6), never written by the model. */
export function CostTable({ compact }: { compact?: boolean }) {
  const c = exAnteCosts(ALBERS_COMMITMENT);
  return (
    <div data-testid="cost-table">
      <table className="w-full text-sm">
        <thead className="text-left text-xs text-slate-500">
          <tr><th className="py-1">Cost</th>{!compact && <th>Basis</th>}<th className="text-right">% p.a.</th><th className="text-right">€ p.a. yrs 1–5</th>{!compact && <th className="text-right">€ p.a. yrs 6–10</th>}</tr>
        </thead>
        <tbody className="tnum">
          {c.rows.map((r) => (
            <tr key={r.label} className="border-t border-slate-100">
              <td className="py-1">{r.label}</td>
              {!compact && <td className="text-xs text-slate-500">{r.basis}</td>}
              <td className="text-right">{r.pct === null ? <span className="text-xs text-slate-500">performance-dependent</span> : pct(r.pct, 2)}</td>
              <td className="text-right">{r.eurEarly === null ? <span className="text-xs text-slate-500">illustrative only</span> : eur(r.eurEarly)}</td>
              {!compact && <td className="text-right">{r.eurLate === null ? '—' : eur(r.eurLate)}</td>}
            </tr>
          ))}
          <tr className="border-t border-slate-300 font-semibold">
            <td className="py-1">Total ongoing</td>{!compact && <td />}<td className="text-right">{pct(c.totalPctEarly, 2)}</td><td className="text-right">{eur(c.totalEarlyEur)}</td>{!compact && <td className="text-right">{eur(c.totalLateEur)}</td>}
          </tr>
        </tbody>
      </table>
      <div className="mt-2 flex flex-wrap justify-between gap-2 text-sm">
        <span>Total ongoing costs over 10 years (illustration): <b className="tnum">{eur(c.tenYearTotalEur)}</b></span>
        <span className="text-xs text-slate-500">Commitment {eur(ALBERS_COMMITMENT)} · years 6–10: management fee 1.50% on NAV, NAV assumed = commitment</span>
      </div>
      <p className="mt-1 text-xs text-slate-600">Costs reduce your return. {c.illustration}</p>
    </div>
  );
}
