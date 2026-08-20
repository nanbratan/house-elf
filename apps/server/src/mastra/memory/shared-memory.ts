/**
 * The memory every agent shares.
 *
 * No storage of its own: Mastra hands an agent's memory the instance's
 * `PostgresStore` when the agent is registered, so constructing one here would
 * open a second pool to the same database. That store also creates the
 * `mastra_resources` table on init — there is no migration to write.
 *
 * Nothing is remembered until a caller names both a thread and a resource. With
 * either missing the memory tools are skipped and only a debug line is logged,
 * which reads exactly like memory being switched off.
 */

import { Memory, ModelByInputTokens } from '@mastra/memory';

import { routerModelId } from '../model-router';
import { EXTRACTOR_MAX_INPUT_TOKENS, EXTRACTOR_MODEL_ID, OBSERVER_MODEL_ID } from '../models';
import { workingMemoryInstruction, WORKING_MEMORY_TEMPLATE } from './working-memory-template';

export const sharedMemory = new Memory({
	options: {
		// Inert while observational memory is on: OM loads the raw window itself as
		// every message since it last observed (`perPage: false`), bounded by
		// `observation.messageTokens` rather than by any count here.
		//
		// Truthy anyway, for the readers that are not OM — a falsy value makes
		// `Agent.getMemoryMessages` return nothing and disables history in
		// `Memory.recall`.
		lastMessages: 20,
		workingMemory: {
			enabled: true,
			// Stated rather than inherited: this is the difference between an
			// assistant that knows you and one that starts from nothing every
			// conversation, so losing it should take an edit, not a changed default.
			scope: 'resource',
			template: WORKING_MEMORY_TEMPLATE
		},
		observationalMemory: {
			// A separate setting from working memory's scope above. Resource scope
			// here is experimental upstream, where one thread resumes work another
			// left unfinished.
			scope: 'thread',
			observation: {
				// Tiered by input size, which is the only thing separating the two jobs
				// this one setting covers: a per-message extraction sees one exchange,
				// a compaction sees the whole window.
				model: new ModelByInputTokens({
					upTo: {
						[EXTRACTOR_MAX_INPUT_TOKENS]: routerModelId({ id: EXTRACTOR_MODEL_ID }),
						1_000_000: routerModelId({ id: OBSERVER_MODEL_ID })
					}
				}),
				instruction: workingMemoryInstruction(),
				// Also takes `updateWorkingMemory` off the agent, so remembering no
				// longer depends on it choosing to write something down mid-answer.
				manageWorkingMemory: true,
				// Otherwise the Observer first runs ~6k tokens in, and a two-line
				// exchange that names a city would never reach that.
				bufferOnIdle: true,
				// Not `enabled: false`, which this repo uses elsewhere: the model
				// publishes `mandatory: true` and the pinned id 400s on it, while a
				// failed observation is silent. `low` costs the same and thinks least.
				providerOptions: { openrouter: { reasoning: { effort: 'low' } } }
			}
		}
	}
});
