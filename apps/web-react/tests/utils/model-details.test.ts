import { describe, expect, it } from 'vitest';

import { priceLabel, settingList, warnings } from '../../src/lib/utils/model-details.ts';
import { selectableModel } from '../helpers/models.ts';

const withTools = selectableModel({
	id: 'anthropic/claude-opus-5',
	supportedParameters: ['temperature', 'reasoning', 'tools', 'reasoning_effort']
});

const withoutTools = selectableModel({
	id: 'deepseek/deepseek-chat',
	supportedParameters: ['temperature', 'reasoning']
});

const router = selectableModel({
	id: 'openrouter/auto',
	label: 'Auto Router',
	isRouter: true,
	pricing: { prompt: '-1', completion: '-1' }
});

const free = selectableModel({
	id: 'meta-llama/llama-4-scout',
	isFree: true,
	pricing: { prompt: '0', completion: '0' }
});

describe('warnings', () => {
	it('warns "Cannot call tools" when the model has no tools, because it breaks the shipped tool', () => {
		const list = warnings(withoutTools);

		expect(list).toEqual([{ id: 'no-tools', label: 'Cannot call tools' }]);
	});

	it('does not warn when the model can call tools', () => {
		expect(warnings(withTools)).toEqual([]);
	});
});

describe('settingList', () => {
	it('lists the capabilities the settings panel can act on, by their display names', () => {
		expect(settingList(withTools)).toEqual(['Temperature', 'Thinking', 'Thinking effort', 'Tools']);
	});

	it('is empty when the model exposes none of the settings', () => {
		const bare = selectableModel({ supportedParameters: ['seed'] });
		expect(settingList(bare)).toEqual([]);
	});

	it('does not list capabilities the app does not expose', () => {
		const noisy = selectableModel({ supportedParameters: ['top_k', 'frequency_penalty'] });
		expect(settingList(noisy)).toEqual([]);
	});
});

describe('priceLabel', () => {
	it('reads "from" so a tiered model is not quoted as an exact price', () => {
		expect(priceLabel(withTools)).toMatch(/^from \$/);
	});

	it('says "varies" for a router, whose "-1" pricing is a sentinel not a number', () => {
		expect(priceLabel(router)).toBe('Varies — set by the model the router picks');
	});

	it('shows zero as zero for a free model, not as a negative or blank', () => {
		expect(priceLabel(free)).toBe('from $0.00 / $0.00 per 1M tokens');
	});
});
