import type { ModelCatalog } from '@house-elf/shared';
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

import { optionalThinking, selectableModel } from '../helpers/models.ts';

import { useModelSelection } from '../../src/lib/hooks/model-selection.ts';

const catalog = {
	initialModelId: 'anthropic/claude-haiku-4-5',
	models: [
		selectableModel({ id: 'anthropic/claude-sonnet-4-6', ...optionalThinking }),
		selectableModel({ id: 'anthropic/claude-haiku-4-5', ...optionalThinking }),
		selectableModel({ id: 'test/never-thinks' })
	]
} satisfies ModelCatalog;

const storageKey = 'selected_model';

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

	it('carries the whole model, so callers do not look it up again', () => {
		const { result } = renderHook(() => useModelSelection(catalog, localStorage));

		act(() => {
			result.current.select('test/never-thinks');
		});

		expect(result.current.selectedModel.id).toBe('test/never-thinks');
		expect(result.current.selectedModel.supportedParameters).toEqual(['temperature']);
	});
});
