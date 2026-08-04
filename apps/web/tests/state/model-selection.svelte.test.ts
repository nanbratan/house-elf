import type { ModelCatalog } from '@house-elf/shared';
import { beforeEach, describe, expect, it } from 'vitest';

import {
	mandatoryThinking,
	optionalThinking,
	selectableModel,
	undescribedThinking
} from '../helpers/models.ts';

import { createModelSelection } from '$lib/state/model-selection.svelte';

const catalog = {
	initialModelId: 'anthropic/claude-haiku-4-5',
	models: [
		selectableModel({ id: 'anthropic/claude-sonnet-4-6', ...optionalThinking }),
		selectableModel({ id: 'anthropic/claude-haiku-4-5', ...optionalThinking }),
		selectableModel({ id: 'test/always-thinks', ...mandatoryThinking }),
		selectableModel({ id: 'test/router', ...undescribedThinking }),
		selectableModel({ id: 'test/never-thinks' })
	]
} satisfies ModelCatalog;

const storageKey = 'house-elf:selected-model';
const thinkingStorageKey = 'house-elf:thinking';

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

	it('falls back to the initial model, not the first listed, for an id the catalog lost', () => {
		const selection = createModelSelection(catalog, localStorage);

		selection.select('anthropic/claude-retired-1');

		// The first entry is whichever model the catalog happened to list first; the
		// initial one is the choice the picker is meant to open on.
		expect(selection.selectedModel.id).toBe('anthropic/claude-haiku-4-5');
	});

	it('changes and persists the selection together', () => {
		const selection = createModelSelection(catalog, localStorage);

		selection.select('anthropic/claude-sonnet-4-6');

		expect(selection.selectedModelId).toBe('anthropic/claude-sonnet-4-6');
		expect(localStorage.getItem(storageKey)).toBe('anthropic/claude-sonnet-4-6');
	});
});

describe('thinking', () => {
	it('is off until it is asked for', () => {
		const selection = createModelSelection(catalog, localStorage);

		expect(selection.thinking).toBe(false);
	});

	it('changes and persists together', () => {
		const selection = createModelSelection(catalog, localStorage);

		selection.setThinking(true);

		expect(selection.thinking).toBe(true);
		expect(localStorage.getItem(thinkingStorageKey)).toBe('true');
	});

	it('is restored across a reload', () => {
		localStorage.setItem(thinkingStorageKey, 'true');

		expect(createModelSelection(catalog, localStorage).thinking).toBe(true);
	});

	it('is not restored onto a model that cannot be asked', () => {
		// Otherwise a stale flag turns into a rejected request on the first send.
		localStorage.setItem(storageKey, 'test/never-thinks');
		localStorage.setItem(thinkingStorageKey, 'true');

		expect(createModelSelection(catalog, localStorage).thinking).toBe(false);
	});

	it('is forced off by choosing a model that cannot think', () => {
		const selection = createModelSelection(catalog, localStorage);
		selection.setThinking(true);

		selection.select('test/never-thinks');

		expect(selection.thinking).toBe(false);
		expect(selection.canChooseThinking).toBe(false);
	});

	it('does not come back when the capable model does', () => {
		// An unasked-for expensive request is worse than an extra click.
		const selection = createModelSelection(catalog, localStorage);
		selection.setThinking(true);
		selection.select('test/never-thinks');

		selection.select('anthropic/claude-haiku-4-5');

		expect(selection.thinking).toBe(false);
		expect(selection.canChooseThinking).toBe(true);
	});

	it('reports an always-on model as thinking, and offers no choice about it', () => {
		const selection = createModelSelection(catalog, localStorage);

		selection.select('test/always-thinks');

		expect(selection.thinking).toBe(true);
		expect(selection.canChooseThinking).toBe(false);
	});

	it('is offered on a model that takes the parameter but describes no reasoning', () => {
		// `openrouter/auto` is this shape, and it is where a first visit starts.
		const selection = createModelSelection(catalog, localStorage);

		selection.select('test/router');

		expect(selection.canChooseThinking).toBe(true);
	});
});
