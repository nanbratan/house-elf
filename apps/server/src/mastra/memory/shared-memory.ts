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

import { Memory } from '@mastra/memory';

import { routerModelId } from '../model-router';
import { OBSERVER_MODEL_ID } from '../models';
import { workingMemorySchema } from './working-memory-schema';

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
			schema: workingMemorySchema
		},
		observationalMemory: {
			// A separate setting from working memory's scope above. Resource scope
			// here is experimental upstream, where one thread resumes work another
			// left unfinished.
			scope: 'thread',
			observation: {
				// Compaction only. The document above is the agent's to write, so
				// observation no longer needs to run after short turns to catch a
				// fact — it runs when the window needs clearing, at `messageTokens`.
				model: routerModelId({ id: OBSERVER_MODEL_ID })
			}
		}
	}
});
