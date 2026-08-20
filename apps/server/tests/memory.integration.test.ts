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
 *
 * The agent no longer writes the document — observational memory took the tool
 * off it — so writing here goes through `updateWorkingMemory`, which is what the
 * Observer's extractor calls once it has decided what to keep.
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

/**
 * The document the Observer keeps, as it stands once a name and a city are
 * known. Markdown per `WORKING_MEMORY_TEMPLATE` — production configures a
 * template rather than a schema.
 */
const REMEMBERED = `# What I know about this person

## Profile

- Their name is Sam
- Lives in Berlin`;

describe('working memory across threads', () => {
	let store: PostgresStore;
	let realFetch: typeof globalThis.fetch;

	beforeAll(async () => {
		store = createTestStore();
		await store.init();

		// Registering the agent is what gives its memory a store; the Memory
		// instance builds none of its own. Without this every read finds nothing.
		new Mastra({ agents: { general: generalAgent }, storage: store });

		// `bufferOnIdle` observes at the end of every turn, on a model fixed when
		// the Memory instance is built rather than per call — so a turn below would
		// reach OpenRouter for real, billably, and blocking the socket is the only
		// lever from here. The Observer swallows its own failures, which is what
		// makes that safe; a main path that tried the network would fail loudly.
		realFetch = globalThis.fetch;
		globalThis.fetch = () => {
			throw new Error('No test may reach the network.');
		};
	});

	afterAll(async () => {
		globalThis.fetch = realFetch;
		await store.close();
	});

	/** Files a fact the way the Observer's extractor does, in a thread of its own. */
	async function remember(resource: string): Promise<void> {
		const memory = await generalAgent.getMemory();
		await memory?.updateWorkingMemory({
			// Resource-scoped, so this thread is where the fact was learned and not
			// where it is filed — which is what the tests below turn on.
			threadId: uniqueId('thread'),
			resourceId: resource,
			workingMemory: REMEMBERED
		});
	}

	/** Everything the model is handed, opening a conversation that has no history. */
	async function openingPrompt(resource: string): Promise<string> {
		const model = new MockLanguageModelV3({ doGenerate: [says('Berlin, you said.')] });

		await generalAgent.generate('Where do I live?', {
			model,
			memory: { thread: uniqueId('thread'), resource }
		});

		return JSON.stringify(model.doGenerateCalls.at(-1)?.prompt);
	}

	it('carries a fact learned in one thread into a brand-new one', async () => {
		const resource = uniqueId('resource');
		await remember(resource);

		expect(await openingPrompt(resource)).toContain('Berlin');
	});

	it('keeps one reader’s memory away from another’s', async () => {
		await remember(uniqueId('resource'));

		expect(await openingPrompt(uniqueId('resource'))).not.toContain('Berlin');
	});

	it('files what it remembers under the owner the app actually uses', async () => {
		const memory = await generalAgent.getMemory();
		await memory?.updateWorkingMemory({
			threadId: uniqueId('thread'),
			resourceId: OWNER_RESOURCE_ID,
			workingMemory: REMEMBERED
		});

		// `threadId` is required by the signature even on a resource-scoped lookup,
		// which reads the resource and ignores it.
		const stored = await memory?.getWorkingMemory({
			threadId: uniqueId('thread'),
			resourceId: OWNER_RESOURCE_ID
		});

		// Not `toContain`: the lookup returns null when this regresses, and that
		// should read as "nothing was stored" rather than as a malformed assertion.
		expect(stored).toEqual(expect.stringContaining('Berlin'));
	});

	it('leaves the agent no tool for writing working memory', async () => {
		// The Observer owns the document now. Were this tool back, two writers
		// would share one document and the last turn to finish would win.
		const memory = await generalAgent.getMemory();

		expect(Object.keys(memory?.listTools({}) ?? {})).toEqual([]);
	});
});
