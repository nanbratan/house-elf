import { Memory, ModelByInputTokens } from '@mastra/memory';

import { routerModelId } from '../../src/mastra/model-router';
import { modeWorkingMemory, observationInstruction, type MemoryMode } from './memory-modes';
import type { ObserverCandidate, TieredModel } from './models';

/**
 * Low enough that every fixture turn crosses it, which is what makes per-turn
 * scoring meaningful: below the threshold the Observer simply doesn't run, and a
 * turn would be scored against the previous turn's document.
 *
 * Production's ~30k default is the opposite trade — there, observing on every
 * turn would be pure cost.
 */
const EVAL_MESSAGE_TOKENS = 1;

function isTieredModel(model: ObserverCandidate['model']): model is TieredModel {
	return typeof model !== 'string';
}

function resolveObservationModel(model: ObserverCandidate['model']): string | ModelByInputTokens {
	if (!isTieredModel(model)) return routerModelId({ id: model });

	const upTo: Record<number, string> = {};
	for (const [threshold, catalogId] of Object.entries(model.upTo)) {
		upTo[Number(threshold)] = routerModelId({ id: catalogId });
	}
	return new ModelByInputTokens({ upTo });
}

/**
 * One fresh `Memory` instance per Observer candidate. Not reusable across
 * candidates: the Observer model and the buffering thresholds below are bound
 * when a `Memory` instance is constructed, not resolved per call — passing a
 * different model on a later call is silently ignored.
 *
 * No `storage` here — Mastra hands an agent's memory the instance's store when
 * the agent is registered (same pattern as the production `sharedMemory`), so
 * constructing one here would open a second, unnecessary pool.
 */
export function buildEvalMemory(candidate: ObserverCandidate, mode: MemoryMode): Memory {
	return new Memory({
		options: {
			// Inert under OM, same reasoning as production — kept truthy only for the
			// non-OM readers (Agent.getMemoryMessages, Memory.recall).
			lastMessages: 20,
			workingMemory: {
				enabled: true,
				scope: 'resource',
				...modeWorkingMemory(mode)
			},
			observationalMemory: {
				scope: 'thread',
				observation: {
					model: resolveObservationModel(candidate.model),
					manageWorkingMemory: true,
					// Schema mode carries the same guidance in its JSON Schema
					// descriptions, so it gets none here and neither mode is told twice.
					instruction: observationInstruction(mode),
					// Forces the Observer call to be awaited inside agent.generate()
					// when the threshold is crossed, instead of firing in the background:
					// each turn's scorer reads the document the moment the turn returns
					// and needs it to be current, not racy.
					//
					// This also rules out `bufferOnIdle`, which production uses — idle
					// buffering is gated on async observation being enabled, and async
					// observation is enabled only when `bufferTokens > 0`. Setting both
					// would silently leave observation never running here.
					bufferTokens: false,
					messageTokens: EVAL_MESSAGE_TOKENS,
					// "auto" already picks the right idle-activation TTL per the
					// underlying provider (5m/1hr/2hr/24hr) — nothing to hand-tune per
					// candidate. Only matters for a candidate whose provider actually
					// supports prompt caching.
					activateAfterIdle: 'auto'
					// providerOptions: {
					// 	openrouter: { reasoning: { effort: candidate.reasoningEffort } }
					// }
				}
			}
		}
	});
}
