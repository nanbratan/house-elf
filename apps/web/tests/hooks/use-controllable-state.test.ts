import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useControllableState } from '../../src/lib/hooks/use-controllable-state.ts';

describe('controllable state the caller does not own', () => {
	it('starts at the default value', () => {
		const { result } = renderHook(() =>
			useControllableState({ value: undefined, defaultValue: 'closed' })
		);

		expect(result.current[0]).toBe('closed');
	});

	it('moves when the setter is called', () => {
		const { result } = renderHook(() =>
			useControllableState({ value: undefined, defaultValue: 'closed' })
		);

		act(() => {
			result.current[1]('open');
		});

		expect(result.current[0]).toBe('open');
	});

	it('reports the next value to onChange', () => {
		const onChange = vi.fn();
		const { result } = renderHook(() =>
			useControllableState({ value: undefined, defaultValue: 'closed', onChange })
		);

		act(() => {
			result.current[1]('open');
		});

		expect(onChange).toHaveBeenCalledWith('open');
	});

	it('ignores a default value that changes after the first render', () => {
		// reasoning recomputes its default every render and expects only the
		// first one to count.
		const { rerender, result } = renderHook(
			(defaultValue: string) => useControllableState({ value: undefined, defaultValue }),
			{ initialProps: 'closed' }
		);

		rerender('open');

		expect(result.current[0]).toBe('closed');
	});

	it('owns an undefined value rather than reading it as a missing one', () => {
		// reasoning's duration state: `defaultValue: undefined` at T = number | undefined.
		const { result } = renderHook(() =>
			useControllableState<number | undefined>({ value: undefined, defaultValue: undefined })
		);

		act(() => {
			result.current[1](3);
		});

		expect(result.current[0]).toBe(3);
	});
});

describe('controllable state the caller owns', () => {
	it('returns the value it was given, not the default', () => {
		const { result } = renderHook(() =>
			useControllableState({ value: 'closed', defaultValue: 'open' })
		);

		expect(result.current[0]).toBe('closed');
	});

	it('does not move on its own when the setter is called', () => {
		const { result } = renderHook(() =>
			useControllableState({ value: 'closed', defaultValue: 'closed' })
		);

		act(() => {
			result.current[1]('open');
		});

		expect(result.current[0]).toBe('closed');
	});

	it('reports the next value to onChange so the owner can apply it', () => {
		const onChange = vi.fn();
		const { result } = renderHook(() =>
			useControllableState({ value: 'closed', defaultValue: 'closed', onChange })
		);

		act(() => {
			result.current[1]('open');
		});

		expect(onChange).toHaveBeenCalledWith('open');
	});

	it('follows the value once the caller starts passing one', () => {
		const { rerender, result } = renderHook(
			(value: string | undefined) => useControllableState({ value, defaultValue: 'closed' }),
			{ initialProps: undefined as string | undefined }
		);

		rerender('open');

		expect(result.current[0]).toBe('open');
	});
});

describe('setting the value it already holds', () => {
	it('reports nothing while the caller does not own it', () => {
		const onChange = vi.fn();
		const { result } = renderHook(() =>
			useControllableState({ value: undefined, defaultValue: 'closed', onChange })
		);

		act(() => {
			result.current[1]('closed');
		});

		expect(onChange).not.toHaveBeenCalled();
	});

	it('reports nothing while the caller owns it', () => {
		const onChange = vi.fn();
		const { result } = renderHook(() =>
			useControllableState({ value: 'closed', defaultValue: 'open', onChange })
		);

		act(() => {
			result.current[1]('closed');
		});

		expect(onChange).not.toHaveBeenCalled();
	});
});

describe('the setter', () => {
	it('keeps its identity across a re-render that passes a fresh onChange', () => {
		// reasoning lists the setter in the deps of the effect owning its
		// one-second auto-close timer, so a setter that churned every render
		// would cancel that timer before it ever fired.
		const { rerender, result } = renderHook(() =>
			useControllableState({
				value: undefined,
				defaultValue: 'closed',
				onChange: () => undefined
			})
		);
		const firstSetter = result.current[1];

		rerender();

		expect(result.current[1]).toBe(firstSetter);
	});

	it('calls the latest onChange, not the one from the render it was created in', () => {
		const first = vi.fn();
		const second = vi.fn();
		const { rerender, result } = renderHook(
			(onChange: (next: string) => void) =>
				useControllableState({ value: undefined, defaultValue: 'closed', onChange }),
			{ initialProps: first as (next: string) => void }
		);

		rerender(second);
		act(() => {
			result.current[1]('open');
		});

		expect(first).not.toHaveBeenCalled();
		expect(second).toHaveBeenCalledWith('open');
	});
});
