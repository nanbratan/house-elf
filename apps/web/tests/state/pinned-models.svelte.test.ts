import { beforeEach, describe, expect, it } from 'vitest';

import { selectableModel } from '../helpers/models.ts';

import { createPinnedModels } from '$lib/state/pinned-models.svelte';

const pinnedKey = 'house-elf:pinned-models';
const collapsedKey = 'house-elf:pinned-collapsed';

const opus = selectableModel({ id: 'anthropic/claude-opus-5', label: 'Opus 5' });
const sonnet = selectableModel({ id: 'anthropic/claude-sonnet-4-5', label: 'Sonnet 4.5' });
const haiku = selectableModel({ id: 'anthropic/claude-haiku-4-5', label: 'Haiku 4.5' });
const catalog = [opus, sonnet, haiku];

beforeEach(() => {
	localStorage.clear();
});

describe('pinned models', () => {
	it('starts empty', () => {
		const pins = createPinnedModels(catalog, localStorage);

		expect(pins.pinnedIds).toEqual([]);
	});

	it('pins a model and persists it', () => {
		const pins = createPinnedModels(catalog, localStorage);

		pins.toggle(opus.id);

		expect(pins.pinnedIds).toEqual([opus.id]);
		expect(pins.isPinned(opus.id)).toBe(true);
		expect(localStorage.getItem(pinnedKey)).toBe(JSON.stringify([opus.id]));
	});

	it('unpins a model and persists the change', () => {
		const pins = createPinnedModels(catalog, localStorage);
		pins.toggle(opus.id);

		pins.toggle(opus.id);

		expect(pins.pinnedIds).toEqual([]);
		expect(pins.isPinned(opus.id)).toBe(false);
		expect(localStorage.getItem(pinnedKey)).toBe(JSON.stringify([]));
	});

	it('sorts pins alphabetically, not by pin time', () => {
		// Stable position beats recency for something the reader is trying to hit
		// without reading.
		const pins = createPinnedModels(catalog, localStorage);

		pins.toggle(sonnet.id);
		pins.toggle(opus.id);
		pins.toggle(haiku.id);

		expect(pins.pinnedIds).toEqual([haiku.id, opus.id, sonnet.id]);
	});

	it('restores pins across a reload', () => {
		localStorage.setItem(pinnedKey, JSON.stringify([sonnet.id, opus.id]));

		const pins = createPinnedModels(catalog, localStorage);

		expect(pins.pinnedIds).toEqual([opus.id, sonnet.id]);
	});

	it('drops a pinned id that is no longer in the catalog, without error', () => {
		// A model that left OpenRouter's catalog is not the reader's problem to clear.
		localStorage.setItem(pinnedKey, JSON.stringify([opus.id, 'anthropic/claude-retired-1']));

		const pins = createPinnedModels(catalog, localStorage);

		expect(pins.pinnedIds).toEqual([opus.id]);
		// The stored list is rewritten so a later save does not resurrect the stale id.
		expect(localStorage.getItem(pinnedKey)).toBe(JSON.stringify([opus.id]));
	});

	it('treats a stored value that is not a list as empty', () => {
		localStorage.setItem(pinnedKey, '{"not":"a list"}');

		const pins = createPinnedModels(catalog, localStorage);

		expect(pins.pinnedIds).toEqual([]);
	});

	it('treats unparseable stored JSON as empty', () => {
		localStorage.setItem(pinnedKey, 'not json at all');

		const pins = createPinnedModels(catalog, localStorage);

		expect(pins.pinnedIds).toEqual([]);
	});
});

describe('the pinned section collapse', () => {
	it('starts expanded', () => {
		const pins = createPinnedModels(catalog, localStorage);

		expect(pins.collapsed).toBe(false);
	});

	it('collapses and persists', () => {
		const pins = createPinnedModels(catalog, localStorage);

		pins.toggleCollapsed();

		expect(pins.collapsed).toBe(true);
		expect(localStorage.getItem(collapsedKey)).toBe('true');
	});

	it('expands again', () => {
		const pins = createPinnedModels(catalog, localStorage);
		pins.toggleCollapsed();

		pins.toggleCollapsed();

		expect(pins.collapsed).toBe(false);
		expect(localStorage.getItem(collapsedKey)).toBe('false');
	});

	it('restores the collapsed state across a reload', () => {
		localStorage.setItem(collapsedKey, 'true');

		const pins = createPinnedModels(catalog, localStorage);

		expect(pins.collapsed).toBe(true);
	});
});
