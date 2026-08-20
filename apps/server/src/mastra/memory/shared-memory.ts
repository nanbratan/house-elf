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

/**
 * The document the agent keeps about its reader.
 *
 * A seed, not a schema: which facts about a person turn out to matter is not
 * knowable in advance, and a fixed field list would have the model filling in a
 * shape that code could maintain on its own. Resist tightening it into one.
 *
 * Additive guidance only. Mastra's injected instruction tells the model to keep
 * empty sections, so inviting it to remove them sets the two pulling against
 * each other.
 */
const WORKING_MEMORY_TEMPLATE = `# About the reader

## Personal
- Name:
- Location:
- Timezone:

## Preferences
- Communication style:

## Notes
- Add what turns out to matter, and why it mattered. Add sections of your own as
  the picture fills in. Skip anything the conversation already makes obvious.
`;

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
				// Compaction only. The document above is the agent's to write, so
				// observation no longer needs to run after short turns to catch a
				// fact — it runs when the window needs clearing, at `messageTokens`.
				model: routerModelId({ id: OBSERVER_MODEL_ID }),
				// Not `enabled: false`, which this repo uses elsewhere: the model
				// publishes `mandatory: true` and the pinned id 400s on it, while a
				// failed observation is silent. `low` costs the same and thinks least.
				providerOptions: { openrouter: { reasoning: { effort: 'low' } } }
			}
		}
	}
});
