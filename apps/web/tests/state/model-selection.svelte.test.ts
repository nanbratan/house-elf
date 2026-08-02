import type { ModelCatalog } from '@house-elf/shared';
import { beforeEach, describe, expect, it } from 'vitest';

import { createModelSelection } from '$lib/state/model-selection.svelte';

const catalog = {
	initialModelId: 'anthropic/claude-haiku-4-5',
	models: [
		{
			id: 'anthropic/claude-sonnet-4-6',
			label: 'Sonnet 4.6',
			family: 'sonnet',
			generation: '4.6'
		},
		{
			id: 'anthropic/claude-haiku-4-5',
			label: 'Haiku 4.5',
			family: 'haiku',
			generation: '4.5'
		}
	]
} as const satisfies ModelCatalog;

const storageKey = 'house-elf:selected-model';

beforeEach(() => {
	localStorage.clear();
});

describe('model selection', () => {
	it('restores a stored model that is still in the catalog', () => {
		localStorage.setItem(storageKey, 'anthropic/claude-sonnet-4-6');

		const selection = createModelSelection(catalog, localStorage);

		expect(selection.selectedModelId).toBe('anthropic/claude-sonnet-4-6');
	});

	it('falls back to the catalog initial selection when the stored id is stale', () => {
		localStorage.setItem(storageKey, 'anthropic/claude-retired-1');

		const selection = createModelSelection(catalog, localStorage);

		expect(selection.selectedModelId).toBe('anthropic/claude-haiku-4-5');
	});

	it('starts from the catalog initial selection when nothing has been stored', () => {
		const selection = createModelSelection(catalog, localStorage);

		expect(selection.selectedModelId).toBe('anthropic/claude-haiku-4-5');
	});

	it('changes and persists the selection together', () => {
		const selection = createModelSelection(catalog, localStorage);

		selection.select('anthropic/claude-sonnet-4-6');

		expect(selection.selectedModelId).toBe('anthropic/claude-sonnet-4-6');
		expect(localStorage.getItem(storageKey)).toBe('anthropic/claude-sonnet-4-6');
	});
});
