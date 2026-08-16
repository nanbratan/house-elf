import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

import { effortThinking, selectableModel } from '../helpers/models.ts';

import { useModelSettings } from '../../src/lib/hooks/model-settings.ts';

const storageKey = 'house-elf:model-settings';

const thinker = selectableModel({ id: 'test/thinker', ...effortThinking });
const plain = selectableModel({ id: 'test/plain' });
const catalog = [thinker, plain];

function store(settings: unknown) {
	localStorage.setItem(storageKey, JSON.stringify(settings));
}

beforeEach(() => {
	localStorage.clear();
});

describe('model settings', () => {
	it('starts with nothing set', () => {
		const { result } = renderHook(() => useModelSettings(catalog, thinker.id, localStorage));

		expect(result.current.stored).toEqual({});
		expect(result.current.restored).toBe(true);
	});

	it('keeps a field and persists it', () => {
		const { result } = renderHook(() => useModelSettings(catalog, thinker.id, localStorage));

		act(() => {
			result.current.set('thinking', true);
		});

		expect(result.current.stored).toEqual({ thinking: true });
		expect(localStorage.getItem(storageKey)).toBe(
			JSON.stringify({ 'test/thinker': { thinking: true } })
		);
	});

	it('keeps each model’s settings apart', () => {
		// A choice made about one model must never be read for another: they cost
		// different amounts.
		const { result, rerender } = renderHook(
			({ modelId }) => useModelSettings(catalog, modelId, localStorage),
			{ initialProps: { modelId: thinker.id } }
		);
		act(() => {
			result.current.set('thinking', true);
		});

		rerender({ modelId: plain.id });

		expect(result.current.stored).toEqual({});
	});

	it('brings a model’s settings back when it is selected again', () => {
		const { result, rerender } = renderHook(
			({ modelId }) => useModelSettings(catalog, modelId, localStorage),
			{ initialProps: { modelId: thinker.id } }
		);
		act(() => {
			result.current.set('effort', 'low');
		});
		rerender({ modelId: plain.id });

		rerender({ modelId: thinker.id });

		expect(result.current.stored).toEqual({ effort: 'low' });
	});

	it('keeps both changes when two are made from one handler', () => {
		// The second call must build on the first. Deriving the next map from the
		// render's own state instead of the updater's would silently drop the
		// earlier field, in React state and in storage alike.
		const { result } = renderHook(() => useModelSettings(catalog, thinker.id, localStorage));

		act(() => {
			result.current.set('thinking', true);
			result.current.set('effort', 'high');
		});

		expect(result.current.stored).toEqual({ thinking: true, effort: 'high' });
		expect(localStorage.getItem(storageKey)).toBe(
			JSON.stringify({ 'test/thinker': { thinking: true, effort: 'high' } })
		);
	});

	it('unsets a field when it is given nothing', () => {
		const { result } = renderHook(() => useModelSettings(catalog, thinker.id, localStorage));
		act(() => {
			result.current.set('effort', 'low');
		});

		act(() => {
			result.current.set('effort', undefined);
		});

		expect(result.current.stored).toEqual({});
	});

	it('drops an entry that has nothing left in it', () => {
		// Storage lists the models the reader changed something on; one they undid
		// is indistinguishable from one they never opened.
		const { result } = renderHook(() => useModelSettings(catalog, thinker.id, localStorage));
		act(() => {
			result.current.set('effort', 'low');
		});

		act(() => {
			result.current.set('effort', undefined);
		});

		expect(localStorage.getItem(storageKey)).toBe('{}');
	});

	it('restores settings across a reload', () => {
		store({ 'test/thinker': { thinking: true, effort: 'high' } });

		const { result } = renderHook(() => useModelSettings(catalog, thinker.id, localStorage));

		expect(result.current.stored).toEqual({ thinking: true, effort: 'high' });
	});

	it('drops settings for a model the catalog no longer carries, and rewrites storage', () => {
		store({ 'test/retired': { thinking: true }, 'test/thinker': { thinking: true } });

		const { result } = renderHook(() => useModelSettings(catalog, thinker.id, localStorage));

		expect(result.current.stored).toEqual({ thinking: true });
		// Rewritten so a later save cannot resurrect the stale entry.
		expect(localStorage.getItem(storageKey)).toBe(
			JSON.stringify({ 'test/thinker': { thinking: true } })
		);
	});

	it('drops a value a still-listed model no longer supports', () => {
		store({ 'test/thinker': { thinking: true, effort: 'xhigh' } });

		const { result } = renderHook(() => useModelSettings(catalog, thinker.id, localStorage));

		expect(result.current.stored).toEqual({ thinking: true });
	});

	it('leaves storage alone when there was nothing to prune', () => {
		const written = JSON.stringify({ 'test/thinker': { thinking: true } });
		localStorage.setItem(storageKey, written);

		renderHook(() => useModelSettings(catalog, thinker.id, localStorage));

		expect(localStorage.getItem(storageKey)).toBe(written);
	});
});

describe('before storage has been read', () => {
	it('reports nothing restored, so the trigger can draw a skeleton instead of a wrong word', () => {
		// No `initialStorage`: this is the app's own path, where localStorage can
		// only be reached after hydration.
		store({ 'test/thinker': { thinking: true } });

		const { result } = renderHook(() => useModelSettings(catalog, thinker.id));

		// The effect has already run by the time renderHook returns, so what this
		// pins is that the restore lands at all and reports itself as landed.
		expect(result.current.restored).toBe(true);
		expect(result.current.stored).toEqual({ thinking: true });
	});
});
