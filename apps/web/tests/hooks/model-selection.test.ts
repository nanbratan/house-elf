import type { ModelCatalog } from '@house-elf/shared';
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

import {
	mandatoryThinking,
	optionalThinking,
	selectableModel,
	undescribedThinking
} from '../helpers/models.ts';

import { useModelSelection } from '../../src/lib/hooks/model-selection.ts';

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

		const { result } = renderHook(() => useModelSelection(catalog, localStorage));

		expect(result.current.selectedModelId).toBe('anthropic/claude-sonnet-4-6');
	});

	it('falls back to the catalog initial selection when the stored id is stale', () => {
		localStorage.setItem(storageKey, 'anthropic/claude-retired-1');

		const { result } = renderHook(() => useModelSelection(catalog, localStorage));

		expect(result.current.selectedModelId).toBe('anthropic/claude-haiku-4-5');
	});

	it('falls back to the initial model, not the first listed, for an id the catalog lost', () => {
		const { result } = renderHook(() => useModelSelection(catalog, localStorage));

		act(() => {
			result.current.select('anthropic/claude-retired-1');
		});

		// The first entry is whichever model the catalog happened to list first; the
		// initial one is the choice the picker is meant to open on.
		expect(result.current.selectedModel.id).toBe('anthropic/claude-haiku-4-5');
	});

	it('changes and persists the selection together', () => {
		const { result } = renderHook(() => useModelSelection(catalog, localStorage));

		act(() => {
			result.current.select('anthropic/claude-sonnet-4-6');
		});

		expect(result.current.selectedModelId).toBe('anthropic/claude-sonnet-4-6');
		expect(localStorage.getItem(storageKey)).toBe('anthropic/claude-sonnet-4-6');
	});
});

describe('thinking', () => {
	it('is off until it is asked for', () => {
		const { result } = renderHook(() => useModelSelection(catalog, localStorage));

		expect(result.current.thinking).toBe(false);
	});

	it('changes and persists together', () => {
		const { result } = renderHook(() => useModelSelection(catalog, localStorage));

		act(() => {
			result.current.setThinking(true);
		});

		expect(result.current.thinking).toBe(true);
		expect(localStorage.getItem(thinkingStorageKey)).toBe('true');
	});

	it('is restored across a reload', () => {
		localStorage.setItem(thinkingStorageKey, 'true');

		const { result } = renderHook(() => useModelSelection(catalog, localStorage));

		expect(result.current.thinking).toBe(true);
	});

	it('is not restored onto a model that cannot be asked', () => {
		// Otherwise a stale flag turns into a rejected request on the first send.
		localStorage.setItem(storageKey, 'test/never-thinks');
		localStorage.setItem(thinkingStorageKey, 'true');

		const { result } = renderHook(() => useModelSelection(catalog, localStorage));

		expect(result.current.thinking).toBe(false);
	});

	it('is forced off by choosing a model that cannot think', () => {
		const { result } = renderHook(() => useModelSelection(catalog, localStorage));
		act(() => {
			result.current.setThinking(true);
		});

		act(() => {
			result.current.select('test/never-thinks');
		});

		expect(result.current.thinking).toBe(false);
		expect(result.current.canChooseThinking).toBe(false);
	});

	it('does not come back when the capable model does', () => {
		// An unasked-for expensive request is worse than an extra click.
		const { result } = renderHook(() => useModelSelection(catalog, localStorage));
		act(() => {
			result.current.setThinking(true);
		});
		act(() => {
			result.current.select('test/never-thinks');
		});

		act(() => {
			result.current.select('anthropic/claude-haiku-4-5');
		});

		expect(result.current.thinking).toBe(false);
		expect(result.current.canChooseThinking).toBe(true);
	});

	it('reports an always-on model as thinking, and offers no choice about it', () => {
		const { result } = renderHook(() => useModelSelection(catalog, localStorage));

		act(() => {
			result.current.select('test/always-thinks');
		});

		expect(result.current.thinking).toBe(true);
		expect(result.current.canChooseThinking).toBe(false);
	});

	it('is offered on a model that takes the parameter but describes no reasoning', () => {
		// `openrouter/auto` is this shape, and it is where a first visit starts.
		const { result } = renderHook(() => useModelSelection(catalog, localStorage));

		act(() => {
			result.current.select('test/router');
		});

		expect(result.current.canChooseThinking).toBe(true);
	});
});
