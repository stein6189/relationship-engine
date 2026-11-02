'use client';
import React, { useState } from 'react';
import clsx from 'clsx';

export function Card({ children, className, ...p }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={clsx('rounded-xl border border-slate-200 bg-white shadow-sm', className)} {...p}>{children}</div>;
}

type BtnVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export function Button({ variant = 'secondary', className, ...p }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: BtnVariant }) {
  return (
    <button
      className={clsx(
        'inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-40',
        variant === 'primary' && 'bg-accent text-white hover:bg-accent-dark',
        variant === 'secondary' && 'border border-slate-300 bg-white text-ink hover:bg-slate-50',
        variant === 'ghost' && 'text-slate-600 hover:bg-slate-100',
        variant === 'danger' && 'border border-red-300 bg-white text-red-700 hover:bg-red-50',
        className,
      )}
      {...p}
    />
  );
}

type Tone = 'slate' | 'teal' | 'amber' | 'red' | 'green' | 'blue' | 'violet';
export function Badge({ tone = 'slate', children, className, title }: { tone?: Tone; children: React.ReactNode; className?: string; title?: string }) {
  return (
    <span title={title} className={clsx('inline-flex items-center gap-1 whitespace-nowrap rounded-md px-1.5 py-0.5 text-[11px] font-medium ring-1 ring-inset', {
      'bg-slate-50 text-slate-700 ring-slate-200': tone === 'slate',
      'bg-teal-50 text-teal-800 ring-teal-200': tone === 'teal',
      'bg-amber-50 text-amber-800 ring-amber-300': tone === 'amber',
      'bg-red-50 text-red-700 ring-red-300': tone === 'red',
      'bg-green-50 text-green-800 ring-green-300': tone === 'green',
      'bg-sky-50 text-sky-800 ring-sky-200': tone === 'blue',
      'bg-violet-50 text-violet-800 ring-violet-200': tone === 'violet',
    }, className)}>{children}</span>
  );
}

const GLOSSARY: Record<string, string> = {
  'capital call': 'A capital call is when a private markets fund asks investors to pay in part of the amount they committed.',
  distribution: 'A distribution is money a fund pays back to investors, usually after selling a company.',
  'J-curve': 'The J-curve: young private equity funds often show a loss in their first years (fees, early costs) before value grows.',
  AIF: 'AIF: an alternative investment fund, e.g. a private equity fund. Usually only for semi-professional or professional investors.',
  ELTIF: 'ELTIF: an EU fund type for long-term private market investments, open to more investors with lower minimums.',
  suitability: 'Suitability: under MiFID II, the advisor must check and document why a product fits the client before advising on it.',
  'lending value': 'Lending value: the share of an asset’s value a bank will lend against it.',
  'share of wallet': 'Share of wallet: the part of a client’s investable wealth that is held with us.',
  KAGB: 'KAGB: the German Capital Investment Code. It sets who may invest in AIFs, e.g. semi-professional investors with at least €200,000.',
  'semi-professional': 'Semi-professional investor: may invest in AIFs if they commit at least €200,000, declare the risks in writing and the firm is satisfied they understand them.',
  'control group': 'Control group: a random group that gets the old treatment, so we can measure whether proactive contact really reduces churn.',
};
export function Term({ t, children }: { t: keyof typeof GLOSSARY | string; children?: React.ReactNode }) {
  return <span className="cursor-help border-b border-dotted border-slate-400" title={GLOSSARY[t] ?? t}>{children ?? t}</span>;
}

export function Stat({ label, value, sub, tone }: { label: string; value: React.ReactNode; sub?: React.ReactNode; tone?: 'teal' | 'amber' | 'red' }) {
  return (
    <Card className="px-4 py-3">
      <div className="text-xs text-slate-500">{label}</div>
      <div className={clsx('tnum mt-0.5 text-xl font-semibold', tone === 'teal' && 'text-accent', tone === 'amber' && 'text-amber-700', tone === 'red' && 'text-red-700')}>{value}</div>
      {sub && <div className="mt-0.5 text-xs text-slate-500">{sub}</div>}
    </Card>
  );
}

export function SectionTitle({ children, right }: { children: React.ReactNode; right?: React.ReactNode }) {
  return <div className="mb-2 flex items-center justify-between"><h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">{children}</h2>{right}</div>;
}

export function Drawer({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/30" onClick={onClose}>
      <div className="h-full w-full max-w-xl overflow-y-auto bg-white p-5 shadow-2xl" onClick={(e) => e.stopPropagation()} role="dialog" aria-label={title}>
        <div className="mb-4 flex items-center justify-between"><h3 className="text-base font-semibold">{title}</h3><Button variant="ghost" onClick={onClose} aria-label="Close">✕</Button></div>
        {children}
      </div>
    </div>
  );
}

export function Modal({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/30 p-4" onClick={onClose}>
      <div className="w-full max-w-lg rounded-xl bg-white p-5 shadow-2xl" onClick={(e) => e.stopPropagation()} role="dialog" aria-label={title}>
        <div className="mb-3 flex items-center justify-between"><h3 className="text-base font-semibold">{title}</h3><Button variant="ghost" onClick={onClose} aria-label="Close">✕</Button></div>
        {children}
      </div>
    </div>
  );
}

export function useToggle(v = false) { const [s, set] = useState(v); return [s, () => set((x) => !x), set] as const; }

export function Spinner() { return <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-slate-300 border-t-accent" aria-label="loading" />; }
