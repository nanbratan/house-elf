import type { SelectableModel } from '@house-elf/shared';
import { describe, expect, it } from 'vitest';

import { ThinkingNotSupportedError, thinkingProviderOptions, wantsThinking } from './thinking.ts';

/**
 * The reasoning shapes the live catalog actually contains — including
 * `openrouter/auto`, which accepts the parameter while publishing no `reasoning`
 * object. Asserted into shape rather than taken from the fixture: this module
 * reads nothing from a model but `id`, `supportedParameters` and `reasoning`.
 */
function modelWith(
	supportedParameters: string[],
	reasoning?: SelectableModel['reasoning']
): SelectableModel {
	return { id: 'test/model', supportedParameters, reasoning } as SelectableModel;
}

const optional = modelWith(['temperature', 'reasoning'], { mandatory: false });
const undescribed = modelWith(['temperature', 'reasoning']);
const mandatory = modelWith(['temperature', 'reasoning'], { mandatory: true });
const cannotThink = modelWith(['temperature']);

describe('wantsThinking', () => {
	it('treats an absent flag as a request for no thinking', () => {
		expect(wantsThinking(undefined)).toBe(false);
	});

	// The flag arrives from a browser, so it is not necessarily a boolean.
	it.each([['true'], [1]])('does not treat %o as thinking on', (requested) => {
		expect(wantsThinking(requested)).toBe(false);
	});

	it('reads a real true', () => {
		expect(wantsThinking(true)).toBe(true);
	});
});

describe('thinkingProviderOptions', () => {
	it('states thinking-off out loud rather than omitting it', () => {
		// Several models think unless told not to. Saying nothing would give the
		// user a default they did not pick.
		expect(thinkingProviderOptions(optional, false)).toEqual({
			openrouter: { reasoning: { enabled: false } }
		});
	});

	it('asks for thinking through the parameter OpenRouter unifies on', () => {
		expect(thinkingProviderOptions(optional, true)).toEqual({
			openrouter: { reasoning: { enabled: true } }
		});
	});

	it('sends nothing for a mandatory-reasoning model, which has no say to give', () => {
		expect(thinkingProviderOptions(mandatory, true)).toBeUndefined();
		expect(thinkingProviderOptions(mandatory, false)).toBeUndefined();
	});

	it('offers the choice on a model that takes the parameter but describes no reasoning', () => {
		// `openrouter/auto` is exactly this, and it is the model a first visit
		// starts on. A live request with `enabled: true` did stream reasoning.
		expect(thinkingProviderOptions(undescribed, true)).toEqual({
			openrouter: { reasoning: { enabled: true } }
		});
	});

	it('refuses to ask a model that cannot think', () => {
		expect(() => thinkingProviderOptions(cannotThink, true)).toThrow(ThinkingNotSupportedError);
	});

	it('sends nothing for a model that cannot think and was not asked to', () => {
		expect(thinkingProviderOptions(cannotThink, false)).toBeUndefined();
	});
});
