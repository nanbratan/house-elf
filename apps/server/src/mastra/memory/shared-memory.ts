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
		// Neither `schema` nor `template`: Mastra supplies its own default. A schema
		// travels by `response_format`, where the compaction model double-encodes it
		// and some providers reject what a `Record` generates.
		workingMemory: {
			enabled: true,
			// Stated rather than inherited: this is the difference between an
			// assistant that knows you and one that starts from nothing every
			// conversation, so losing it should take an edit, not a changed default.
			scope: 'resource'
		},
		observationalMemory: {
			// A separate setting from working memory's scope above. Resource scope
			// here is experimental upstream, where one thread resumes work another
			// left unfinished.
			scope: 'thread',
			observation: {
				// Otherwise the Observer first runs ~6k tokens in, and a two-line
				// exchange that names a city would never reach that. Gated on
				// `bufferTokens` being above zero, so both are needed.
				bufferOnIdle: true,
				bufferTokens: 0.2,
				// Also takes `updateWorkingMemory` off the agent, so remembering no
				// longer depends on it choosing to write something down mid-answer.
				manageWorkingMemory: true,
				// Input size is all that separates the two jobs this one setting
				// covers: extraction sees one exchange, compaction the whole window.
				model: new ModelByInputTokens({
					upTo: {
						[EXTRACTOR_MAX_INPUT_TOKENS]: routerModelId({ id: EXTRACTOR_MODEL_ID }),
						1_000_000: routerModelId({ id: OBSERVER_MODEL_ID })
					}
				}),
				// Drops attachments on a text-only tier, keeping the placeholder.
				observeAttachments: 'auto'
			}
		}
	}
});
