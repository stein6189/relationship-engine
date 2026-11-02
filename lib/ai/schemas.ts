import { z } from 'zod';

const conf = z.number().min(0).max(1);
const sourced = z.object({ text: z.string(), sourceIds: z.array(z.string()) });

export const schemas = {
  extract_signals: z.object({
    signals: z.array(z.object({
      type: z.enum(['liquidity_need', 'investment_interest', 'transfer_intent', 'dissatisfaction', 'pm_frustration', 'life_event', 'factual_question', 'prefers_low_contact']),
      summary: z.string(),
      amountEur: z.number().nullable().optional(),
      timing: z.string().nullable().optional(),
      topic: z.string().nullable().optional(),
      evidence: z.array(z.object({ itemId: z.string(), quote: z.string() })),
      confidence: conf,
    })),
    churnReasonHypothesis: z.string().optional(),
    uncertainty: z.string().optional(),
  }),
  draft_touchpoint: z.object({
    subject: z.string(),
    body: z.string(),
    messageType: z.enum(['informational', 'personal_outreach', 'advisory']),
    factsUsed: z.array(z.string()),
    callToAction: z.string().optional(),
    confidence: conf,
  }).passthrough(),
  meeting_brief: z.object({
    sentences: z.array(sourced),
    openQuestionsForClient: z.array(z.string()),
    prepareDocuments: z.array(z.string()),
    confidence: conf,
  }),
  draft_suitability: z.object({
    suitability: z.object({
      clientObjectives: z.array(sourced), riskProfile: z.array(sourced), knowledgeAndExperience: z.array(sourced),
      financialSituationAndLossCapacity: z.array(sourced), whyTheProductFits: z.array(sourced), risksExplained: z.array(sourced),
      alternativesConsidered: z.array(sourced),
    }),
    clientMessage: z.object({ subject: z.string(), body: z.string() }),
    crmNote: z.string(),
    openPoints: z.array(z.string()),
    confidence: conf,
  }),
  verify_draft: z.object({
    results: z.array(z.object({ sentenceId: z.string(), verdict: z.enum(['supported', 'unsupported', 'advisory_language']), reason: z.string(), supportingSourceIds: z.array(z.string()) })),
    overall: z.enum(['pass', 'needs_review']),
  }),
  check_qualification_consistency: z.object({
    findings: z.array(z.object({
      field: z.string(), questionnaireValue: z.string(),
      conflictingEvidence: z.array(z.object({ sourceId: z.string(), quote: z.string() })),
      whyItMatters: z.string(), suggestedQuestionForClient: z.string(), confidence: conf,
    })),
  }),
  route_client_question: z.object({
    category: z.enum(['factual', 'advice', 'out_of_scope']),
    clientAnswer: z.string(),
    rmDraft: z.string().optional().default(''),
    factsUsed: z.array(z.string()),
    confidence: conf,
  }),
  explain_option: z.object({ optionId: z.string(), sentence: z.string(), factsUsed: z.array(z.string()), confidence: conf }),
} as const;

export type TaskId = keyof typeof schemas;
export const FAST_TASKS: TaskId[] = ['extract_signals', 'check_qualification_consistency', 'route_client_question', 'explain_option'];
