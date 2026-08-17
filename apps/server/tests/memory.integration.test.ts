import type {
	LanguageModelV3Content,
	LanguageModelV3FinishReason,
	LanguageModelV3GenerateResult,
	LanguageModelV3Usage
} from '@ai-sdk/provider';
import { Mastra } from '@mastra/core/mastra';
import type { PostgresStore } from '@mastra/pg';
import { MockLanguageModelV3 } from 'ai/test';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { generalAgent } from '../src/mastra/agents/general.ts';
import { OWNER_RESOURCE_ID } from '../src/mastra/memory/owner.ts';
import { createTestStore, uniqueId } from './helpers/test-store.ts';

/**
 * What the agent learns in one conversation is there in the next one.
 *
 * Thread-scoping working memory passes every other test in this suite and fails
 * these — which is how to check they still bite.
 *
 * The model is mocked, so the claim is only that a stored fact crosses the thread
 * boundary and reaches the next call. Whether a real model then uses it well is
 * not something a test can assert.
 */

/** Nothing here asserts on cost, so every count is absent rather than invented. */
const NO_USAGE: LanguageModelV3Usage = {
	inputTokens: {
		total: undefined,
		noCache: undefined,
		cacheRead: undefined,
		cacheWrite: undefined
	},
	outputTokens: { total: undefined, text: undefined, reasoning: undefined }
};

function callsTool(toolName: string, input: unknown): LanguageModelV3GenerateResult {
	return turn(
		[{ type: 'tool-call', toolCallId: uniqueId('call'), toolName, input: JSON.stringify(input) }],
		'tool-calls'
	);
}

function says(text: string): LanguageModelV3GenerateResult {
	return turn([{ type: 'text', text }], 'stop');
}

function turn(
	content: LanguageModelV3Content[],
	unified: LanguageModelV3FinishReason['unified']
): LanguageModelV3GenerateResult {
	// No provider ran, so `raw` has nothing to carry alongside the unified reason.
	return { content, finishReason: { unified, raw: undefined }, usage: NO_USAGE, warnings: [] };
}

/** The document the mocked model writes on the turn it is told a name and a city. */
const REMEMBERED = `# About the reader

## Personal
- Name: Sam
- Location: Berlin
- Timezone:

## Preferences
- Communication style:

## Notes
`;

describe('working memory across threads', () => {
	let store: PostgresStore;

	beforeAll(async () => {
		store = createTestStore();
		await store.init();

		// Registering the agent is what gives its memory a store; the Memory
		// instance builds none of its own. Without this every read finds nothing.
		new Mastra({ agents: { general: generalAgent }, storage: store });
	});

	afterAll(async () => {
		await store.close();
	});

	it('carries a fact learned in one thread into a brand-new one', async () => {
		const resource = uniqueId('resource');
		const model = new MockLanguageModelV3({
			doGenerate: [
				callsTool('updateWorkingMemory', { memory: REMEMBERED }),
				says('Noted.'),
				says('You live in Berlin.')
			]
		});

		await generalAgent.generate('My name is Sam and I live in Berlin.', {
			model,
			memory: { thread: uniqueId('thread'), resource }
		});

		await generalAgent.generate('Where do I live?', {
			model,
			memory: { thread: uniqueId('thread'), resource }
		});

		const secondConversation = model.doGenerateCalls.at(-1);

		expect(JSON.stringify(secondConversation?.prompt)).toContain('Berlin');
	});

	it('keeps one reader’s memory away from another’s', async () => {
		const model = new MockLanguageModelV3({
			doGenerate: [
				callsTool('updateWorkingMemory', { memory: REMEMBERED }),
				says('Noted.'),
				says('I do not know.')
			]
		});

		await generalAgent.generate('My name is Sam and I live in Berlin.', {
			model,
			memory: { thread: uniqueId('thread'), resource: uniqueId('resource') }
		});

		await generalAgent.generate('Where do I live?', {
			model,
			memory: { thread: uniqueId('thread'), resource: uniqueId('resource') }
		});

		const otherReader = model.doGenerateCalls.at(-1);

		expect(JSON.stringify(otherReader?.prompt)).not.toContain('Berlin');
	});

	it('files what it remembers under the owner the app actually uses', async () => {
		const model = new MockLanguageModelV3({
			doGenerate: [callsTool('updateWorkingMemory', { memory: REMEMBERED }), says('Noted.')]
		});
		const thread = uniqueId('thread');

		await generalAgent.generate('My name is Sam and I live in Berlin.', {
			model,
			memory: { thread, resource: OWNER_RESOURCE_ID }
		});

		const memory = await generalAgent.getMemory();
		// `threadId` is required by the signature even on a resource-scoped lookup,
		// which reads the resource and ignores it.
		const stored = await memory?.getWorkingMemory({
			threadId: thread,
			resourceId: OWNER_RESOURCE_ID
		});

		// Not `toContain`: the lookup returns null when this regresses, and that
		// should read as "nothing was stored" rather than as a malformed assertion.
		expect(stored).toEqual(expect.stringContaining('Berlin'));
	});
});
