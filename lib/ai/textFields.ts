import type { TaskId } from './schemas';

/** Client- or RM-facing text produced by the model that must pass the number guard. */
export function textOf(task: TaskId, out: any): string {
  if (!out) return '';
  switch (task) {
    case 'draft_touchpoint': return `${out.subject}\n${out.body}`;
    case 'route_client_question': return `${out.clientAnswer ?? ''}\n${out.rmDraft ?? ''}`;
    case 'explain_option': return out.sentence ?? '';
    case 'meeting_brief': return (out.sentences ?? []).map((s: { text: string }) => s.text).join('\n');
    case 'draft_suitability':
      return [...Object.values(out.suitability ?? {}).flat().map((s) => (s as { text: string }).text), out.clientMessage?.body ?? '', out.crmNote ?? ''].join('\n');
    default: return '';
  }
}
