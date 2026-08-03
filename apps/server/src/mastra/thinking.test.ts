import type { SelectableModel } from '@house-elf/shared';
import { describe, expect, it } from 'vitest';

import { SELECTABLE_MODELS, findModel } from './models';
import {
	THINKING_BUDGET_TOKENS,
	ThinkingNotSupportedError,
	modelsMissingAThinkingMode,
	thinkingProviderOptions,
	wantsThinking
} from './thinking';

function model(id: string): SelectableModel {
	const found = findModel(id);
	if (!found) throw new Error(`${id} is not in the allowlist`);
	return found;
}

const haiku = model('anthropic/claude-haiku-4-5');
const opus5 = model('anthropic/claude-opus-5');

describe('wantsThinking', () => {
	it('treats an absent flag as a request for no thinking', () => {
		expect(wantsThinking(undefined)).toBe(false);
	});

	// The flag arrives from a browser, so it is not necessarily a boolean.
	it.each([['true'], [1], [{}], [null]])('does not treat %o as thinking on', (requested) => {
		expect(wantsThinking(requested)).toBe(false);
	});

	it('reads a real true', () => {
		expect(wantsThinking(true)).toBe(true);
	});
});

describe('thinkingProviderOptions', () => {
	it('states thinking-off out loud rather than omitting it', () => {
		// Opus 5 and Sonnet 5 think unless told not to. Saying nothing would give
		// the user a default they did not pick.
		expect(thinkingProviderOptions(opus5, false)).toEqual({
			anthropic: { thinking: { type: 'disabled' } }
		});
	});

	it('asks a 4.6-or-newer model adaptively, and for a visible summary', () => {
		// `enabled` is a 400 on these; without `summarized` the reasoning pane
		// renders empty because the thinking blocks carry no text.
		expect(thinkingProviderOptions(opus5, true)).toEqual({
			anthropic: { thinking: { type: 'adaptive', display: 'summarized' } }
		});
	});

	it('asks a 4.5 model with a budget, because adaptive is a 400 there', () => {
		expect(thinkingProviderOptions(haiku, true)).toEqual({
			anthropic: { thinking: { type: 'enabled', budgetTokens: THINKING_BUDGET_TOKENS } }
		});
	});

	it('keeps the budget above the provider floor of 1024', () => {
		expect(THINKING_BUDGET_TOKENS).toBeGreaterThanOrEqual(1024);
	});

	// No allowlisted model is in either state today, so these two guard the
	// branches that only a future model list would reach.
	it('sends nothing for an always-on model, which has no say to give', () => {
		expect(thinkingProviderOptions({ ...opus5, thinking: 'always' }, true)).toBeUndefined();
		expect(thinkingProviderOptions({ ...opus5, thinking: 'always' }, false)).toBeUndefined();
	});

	it('refuses to ask a model that cannot think', () => {
		expect(() => thinkingProviderOptions({ ...haiku, thinking: 'unsupported' }, true)).toThrow(
			ThinkingNotSupportedError
		);
		expect(thinkingProviderOptions({ ...haiku, thinking: 'unsupported' }, false)).toBeUndefined();
	});
});

describe('the allowlist and the mode table', () => {
	it('gives every thinking-capable model a way to be asked', () => {
		// A model added to the allowlist without a mode would silently get the
		// extended shape, which is a 400 on anything newer than 4.6.
		expect(modelsMissingAThinkingMode()).toEqual([]);
	});

	it('produces provider options for every model the picker offers', () => {
		for (const model of SELECTABLE_MODELS) {
			expect(() => thinkingProviderOptions(model, true)).not.toThrow();
		}
	});
});
