import { Card, SectionTitle } from '@/components/ui';

const LABOUR = [
  ['Code (rules)', 'Numbers, eligibility, limits, allocation of RM capacity, costs, the number guard'],
  ['AI', 'Reads unstructured text, drafts, explains, checks drafts'],
  ['Relationship manager', 'Judges, decides, approves, owns the advice'],
  ['Client', 'Self-serves facts, reads, signs, funds'],
];

export default function AboutPage() {
  return (
    <div className="max-w-4xl space-y-4" data-testid="about">
      <div>
        <h1 className="text-xl font-semibold">About this prototype</h1>
        <p className="mt-1 text-sm text-slate-600">How the product works and where its limits are.</p>
      </div>
      <Card className="p-5">
        <SectionTitle>Thesis</SectionTitle>
        <p className="text-[15px] leading-relaxed">Today the RM reacts when a client calls. The engine reads the whole book every month, finds the moments that matter, allocates fixed RM capacity deliberately — and gives the client and the RM one shared view of the relationship.</p>
      </Card>
      <Card className="p-5">
        <SectionTitle>Division of labour</SectionTitle>
        <table className="w-full text-sm"><tbody>{LABOUR.map(([w, d]) => <tr key={w} className="border-t border-slate-100 first:border-0"><td className="w-48 py-2 font-medium">{w}</td><td className="py-2 text-slate-700">{d}</td></tr>)}</tbody></table>
      </Card>
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="p-5">
          <SectionTitle>Guardrails</SectionTitle>
          <ul className="list-disc space-y-1.5 pl-4 text-sm text-slate-700">
            <li>Numbers only from code. The model receives them as facts and writes words around them.</li>
            <li>Number guard: any number in AI text that is not in the facts is marked red and needs review.</li>
            <li>Verifier: a second, independent AI call checks every sentence of a suitability draft against its sources.</li>
            <li>RM approval: nothing reaches a client without the RM. The only exception is factual answers about the client’s own data in the app.</li>
            <li>No tracked behaviour in client messages. The RM may see that a client read a page; the client never reads “we saw you…”.</li>
            <li>AI explains, never recommends. Advice questions go to the RM with a draft.</li>
            <li>Uncertainty is visible: confidence below 0.6 is marked “Please verify” and never auto-actioned.</li>
          </ul>
        </Card>
        <Card className="p-5">
          <SectionTitle>Credit, eligibility, data</SectionTitle>
          <ul className="list-disc space-y-1.5 pl-4 text-sm text-slate-700">
            <li>No AI in credit or eligibility decisions. Rules check; the RM attests.</li>
            <li>The liquidity bridge is shown only when a liquidity need exists — never to invest more.</li>
            <li>Data protection: EU processing, no training on client data.</li>
            <li>AI signals are suggestions with a source and a confidence. The RM decides and can override any lane.</li>
            <li>A 10% control group of clients with silent risk tests whether proactive contact really reduces churn.</li>
          </ul>
        </Card>
      </div>
      <Card className="p-5">
        <SectionTitle>What the prototype does not do</SectionTitle>
        <ul className="grid list-disc gap-x-6 gap-y-1 pl-4 text-sm text-slate-700 md:grid-cols-2">
          <li>Send anything to a client automatically</li>
          <li>Offer a free-form chatbot</li>
          <li>Give AI investment or loan advice to clients</li>
          <li>Talk to prospects</li>
          <li>Run a real Lombard credit process (concept only)</li>
          <li>Connect to CRM, custodian or fund administrator</li>
          <li>Handle family structures</li>
          <li>Use real client data — everything here is synthetic</li>
        </ul>
      </Card>
    </div>
  );
}
