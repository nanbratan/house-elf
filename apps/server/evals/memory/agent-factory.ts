import { Agent } from '@mastra/core/agent';
import type { Memory } from '@mastra/memory';

import { routerModelId } from '../../src/mastra/model-router';
import type { MemoryMode } from './memory-modes';
import { EVAL_ANSWERING_MODEL_ID, type ObserverCandidate } from './models';

/** A candidate's Agent id, so register.ts and the eval workflow derive it the same way. */
export function evalAgentId(candidate: ObserverCandidate, mode: MemoryMode): string {
	return `eval-memory-${candidate.id}-${mode}`;
}

/**
 * One Agent per Observer candidate per memory mode, sharing the fixed answering
 * model (`EVAL_ANSWERING_MODEL_ID`) so a score difference is attributable to the
 * candidate's Memory instance — specifically its Observer and how working memory
 * is configured — and not to the answering model phrasing replies differently.
 */
export function buildEvalAgent(
	candidate: ObserverCandidate,
	mode: MemoryMode,
	memory: Memory
): Agent {
	return new Agent({
		id: evalAgentId(candidate, mode),
		name: `Eval Memory — ${candidate.id} (${mode})`,
		instructions: 'You are a helpful personal assistant. Answer concisely.',
		model: routerModelId({ id: EVAL_ANSWERING_MODEL_ID }),
		memory
	});
}
