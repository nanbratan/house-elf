import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

import { selectableModel } from '../helpers/models.ts';

import { usePinnedModels } from '../../src/lib/state/pinned-models.ts';

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
		const { result } = renderHook(() => usePinnedModels(catalog, localStorage));

		expect(result.current.pinnedIds).toEqual([]);
	});

	it('pins a model and persists it', () => {
		const { result } = renderHook(() => usePinnedModels(catalog, localStorage));

		act(() => {
			result.current.toggle(opus.id);
		});

		expect(result.current.pinnedIds).toEqual([opus.id]);
		expect(result.current.isPinned(opus.id)).toBe(true);
		expect(localStorage.getItem(pinnedKey)).toBe(JSON.stringify([opus.id]));
	});

	it('unpins a model and persists the change', () => {
		const { result } = renderHook(() => usePinnedModels(catalog, localStorage));
		act(() => {
			result.current.toggle(opus.id);
		});

		act(() => {
			result.current.toggle(opus.id);
		});

		expect(result.current.pinnedIds).toEqual([]);
		expect(result.current.isPinned(opus.id)).toBe(false);
		expect(localStorage.getItem(pinnedKey)).toBe(JSON.stringify([]));
	});

	it('sorts pins alphabetically, not by pin time', () => {
		// Stable position beats recency for something the reader is trying to hit
		// without reading.
		const { result } = renderHook(() => usePinnedModels(catalog, localStorage));

		act(() => {
			result.current.toggle(sonnet.id);
		});
		act(() => {
			result.current.toggle(opus.id);
		});
		act(() => {
			result.current.toggle(haiku.id);
		});

		expect(result.current.pinnedIds).toEqual([haiku.id, opus.id, sonnet.id]);
	});

	it('restores pins across a reload', () => {
		localStorage.setItem(pinnedKey, JSON.stringify([sonnet.id, opus.id]));

		const { result } = renderHook(() => usePinnedModels(catalog, localStorage));

		expect(result.current.pinnedIds).toEqual([opus.id, sonnet.id]);
	});

	it('drops a pinned id that is no longer in the catalog, without error', () => {
		// A model that left OpenRouter's catalog is not the reader's problem to clear.
		localStorage.setItem(pinnedKey, JSON.stringify([opus.id, 'anthropic/claude-retired-1']));

		const { result } = renderHook(() => usePinnedModels(catalog, localStorage));

		expect(result.current.pinnedIds).toEqual([opus.id]);
		// The stored list is rewritten so a later save does not resurrect the stale id.
		expect(localStorage.getItem(pinnedKey)).toBe(JSON.stringify([opus.id]));
	});

	it('treats a stored value that is not a list as empty', () => {
		localStorage.setItem(pinnedKey, '{"not":"a list"}');

		const { result } = renderHook(() => usePinnedModels(catalog, localStorage));

		expect(result.current.pinnedIds).toEqual([]);
	});

	it('treats unparseable stored JSON as empty', () => {
		localStorage.setItem(pinnedKey, 'not json at all');

		const { result } = renderHook(() => usePinnedModels(catalog, localStorage));

		expect(result.current.pinnedIds).toEqual([]);
	});
});

describe('the pinned section collapse', () => {
	it('starts expanded', () => {
		const { result } = renderHook(() => usePinnedModels(catalog, localStorage));

		expect(result.current.collapsed).toBe(false);
	});

	it('collapses and persists', () => {
		const { result } = renderHook(() => usePinnedModels(catalog, localStorage));

		act(() => {
			result.current.toggleCollapsed();
		});

		expect(result.current.collapsed).toBe(true);
		expect(localStorage.getItem(collapsedKey)).toBe('true');
	});

	it('expands again', () => {
		const { result } = renderHook(() => usePinnedModels(catalog, localStorage));
		act(() => {
			result.current.toggleCollapsed();
		});

		act(() => {
			result.current.toggleCollapsed();
		});

		expect(result.current.collapsed).toBe(false);
		expect(localStorage.getItem(collapsedKey)).toBe('false');
	});

	it('restores the collapsed state across a reload', () => {
		localStorage.setItem(collapsedKey, 'true');

		const { result } = renderHook(() => usePinnedModels(catalog, localStorage));

		expect(result.current.collapsed).toBe(true);
	});
});
