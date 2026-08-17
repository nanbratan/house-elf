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
		// Sizes the whole history window, so not the library default of 10 — five
		// turns is short enough that the agent visibly forgets mid-conversation.
		//
		// Observational memory ignores the number but not the field: enabling it
		// removes the message-history processor entirely, and a falsy value here
		// skips that branch before OM is ever consulted. Keep it truthy.
		lastMessages: 20,
		workingMemory: {
			enabled: true,
			// Stated rather than inherited: this is the difference between an
			// assistant that knows you and one that starts from nothing every
			// conversation, so losing it should take an edit, not a changed default.
			scope: 'resource',
			template: WORKING_MEMORY_TEMPLATE
		}
	}
});
