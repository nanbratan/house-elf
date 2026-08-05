import { describe, expect, it } from 'vitest';

import {
	activeFilterCount,
	availableCapabilities,
	availableModalities,
	availableProviders,
	filterModels,
	noFilters
} from '../../src/lib/utils/model-filters.ts';
import { selectableModel } from '../helpers/models.ts';

const opus = selectableModel({
	id: 'anthropic/claude-opus-5',
	label: 'Opus 5',
	supportedParameters: ['temperature', 'reasoning', 'tools'],
	inputModalities: ['text', 'image']
});
const haiku = selectableModel({
	id: 'anthropic/claude-haiku-4-5',
	label: 'Haiku 4.5',
	supportedParameters: ['temperature', 'tools'],
	inputModalities: ['text']
});
const gpt = selectableModel({
	id: 'openai/gpt-5.3-chat',
	label: 'GPT-5.3 Chat',
	supportedParameters: ['temperature', 'reasoning', 'verbosity'],
	inputModalities: ['text', 'file']
});
const freebie = selectableModel({
	id: 'meta/llama-guard',
	label: 'Llama Guard',
	supportedParameters: ['temperature'],
	isFree: true,
	inputModalities: ['text']
});

const catalog = [opus, haiku, gpt, freebie];

function labels(models: readonly { label: string }[]) {
	return models.map((model) => model.label);
}

describe('which filters are worth showing', () => {
	it('offers a toggle only where the catalog splits', () => {
		// Temperature is on every model here, so a toggle for it would filter
		// nothing; `reasoning_effort` is on none, so its toggle would empty the list.
		expect(availableCapabilities(catalog).map((capability) => capability.id)).toEqual([
			'reasoning',
			'tools',
			'verbosity',
			'free'
		]);
	});

	it('still offers one for a capability only a single model has', () => {
		// Rarity is the reason to have a filter, not to hide it: one model in four
		// is exactly what cannot be found by scrolling.
		expect(availableCapabilities(catalog).map((capability) => capability.label)).toContain(
			'Verbosity'
		);
	});

	it('offers nothing at all for an empty catalog', () => {
		expect(availableCapabilities([])).toEqual([]);
	});

	it('lists providers alphabetically, with how many each holds', () => {
		expect(availableProviders(catalog)).toEqual([
			{ name: 'anthropic', count: 2 },
			{ name: 'meta', count: 1 },
			{ name: 'openai', count: 1 }
		]);
	});

	it('reads a pointer under the provider it points at', () => {
		const pointer = selectableModel({ id: '~anthropic/claude-opus-latest' });

		expect(availableProviders([opus, pointer])).toEqual([{ name: 'anthropic', count: 2 }]);
	});

	it('lists every input modality the catalog offers, once each', () => {
		expect(availableModalities(catalog)).toEqual(['file', 'image', 'text']);
	});
});

describe('narrowing the catalog', () => {
	it('leaves it alone when nothing has been chosen', () => {
		expect(filterModels(catalog, noFilters)).toEqual(catalog);
	});

	it('keeps only the chosen provider', () => {
		const filters = { ...noFilters, providers: new Set(['anthropic']) };

		expect(labels(filterModels(catalog, filters))).toEqual(['Opus 5', 'Haiku 4.5']);
	});

	it('widens the list when a second provider is chosen', () => {
		// Two providers are two answers to one question, so they add up rather than
		// cancelling each other out.
		const filters = { ...noFilters, providers: new Set(['anthropic', 'openai']) };

		expect(labels(filterModels(catalog, filters))).toEqual(['Opus 5', 'Haiku 4.5', 'GPT-5.3 Chat']);
	});

	it('keeps a model that accepts any one of the chosen modalities', () => {
		const filters = { ...noFilters, modalities: new Set(['image', 'file']) };

		expect(labels(filterModels(catalog, filters))).toEqual(['Opus 5', 'GPT-5.3 Chat']);
	});

	it('narrows the list when a second capability is chosen', () => {
		// Two capabilities are one demand: a reader asking for tools and thinking
		// wants a model that does both, not either.
		const both = { ...noFilters, capabilities: new Set(['reasoning', 'tools']) };

		expect(labels(filterModels(catalog, both))).toEqual(['Opus 5']);
	});

	it('reads free as the derived flag, never as a price of zero', () => {
		const filters = { ...noFilters, capabilities: new Set(['free']) };

		expect(labels(filterModels(catalog, filters))).toEqual(['Llama Guard']);
	});

	it('applies a provider and a capability together', () => {
		const filters = {
			...noFilters,
			providers: new Set(['anthropic']),
			capabilities: new Set(['reasoning'])
		};

		expect(labels(filterModels(catalog, filters))).toEqual(['Opus 5']);
	});

	it('counts every answer the reader has given', () => {
		expect(activeFilterCount(noFilters)).toBe(0);
		expect(
			activeFilterCount({
				providers: new Set(['anthropic', 'openai']),
				modalities: new Set(['image']),
				capabilities: new Set(['tools'])
			})
		).toBe(4);
	});
});
