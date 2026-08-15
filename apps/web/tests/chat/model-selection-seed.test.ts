import { describe, expect, it } from 'vitest';

import {
	modelCookieName,
	readModelSelectionSeed,
	seedStorage,
	thinkingCookieName,
	UnknownSeedKeyError
} from '../../src/lib/chat/model-selection-seed.ts';
import { writeCookie } from '../../src/lib/utils/cookies.ts';

/*
 * Under jsdom the isomorphic read takes its client branch. That the server branch
 * reaches the request's cookies — and that a loader is where it has to run, because
 * `ChatView` renders inside a Suspense boundary — is only observable through a real
 * SSR round-trip.
 */
describe('readModelSelectionSeed', () => {
	it('reports nothing persisted as null rather than undefined, so it survives serialisation', () => {
		expect(readModelSelectionSeed()).toEqual({ selectedModelId: null, thinking: null });
	});

	it('carries both persisted values through', () => {
		writeCookie(modelCookieName, 'x-ai/grok-4.6');
		writeCookie(thinkingCookieName, 'true');

		expect(readModelSelectionSeed()).toEqual({
			selectedModelId: 'x-ai/grok-4.6',
			thinking: 'true'
		});
	});
});

describe('seedStorage', () => {
	it('answers reads from the seed the loader resolved, not from the cookie jar', () => {
		writeCookie(modelCookieName, 'stale/from-the-jar');
		const storage = seedStorage({ selectedModelId: 'x-ai/grok-4.6', thinking: null });

		expect(storage.getItem(modelCookieName)).toBe('x-ai/grok-4.6');
		expect(storage.getItem(thinkingCookieName)).toBeNull();
	});

	it('refuses a key it does not carry rather than guessing which value was meant', () => {
		const storage = seedStorage({ selectedModelId: 'x-ai/grok-4.6', thinking: 'true' });

		expect(() => storage.getItem('house-elf:selected-model')).toThrow(UnknownSeedKeyError);
	});

	it('sends writes to the cookie the next request will carry', () => {
		const storage = seedStorage({ selectedModelId: null, thinking: null });

		storage.setItem(modelCookieName, 'x-ai/grok-4.6');

		expect(readModelSelectionSeed().selectedModelId).toBe('x-ai/grok-4.6');
	});
});
