import { useCallback, useEffect, useRef, useState } from 'react';

export interface ControllableStateOptions<T> {
	/** The controlled value. Anything other than `undefined` makes the state controlled. */
	value: T | undefined;
	/** The value to start from while uncontrolled. Read on the first render only. */
	defaultValue: T;
	/** Called with the next value whenever the state changes, in either mode. */
	onChange?: (next: T) => void;
}

/**
 * State that follows a `value` prop when the caller passes one and owns itself
 * when they do not — what every `open`/`selected`/`expanded` prop pair needs.
 *
 * Replaces `@radix-ui/react-use-controllable-state`, which resolved only because
 * `radix-ui` hoists it and would have broken silently when that dependency goes.
 * Two deliberate differences from it:
 *
 * - `onChange` fires from the setter rather than from a passive effect after
 *   commit. No caller can tell: `reasoning`'s `duration` state passes no
 *   `onChange` at all, and its `onOpenChange` comes from `MessagePart`, which
 *   passes none either.
 * - The setter takes a value, not a `SetStateAction`. Resolving an updater on
 *   the uncontrolled path means resolving it against the value this render
 *   closed over, which is wrong once two calls batch — and nothing calls it
 *   that way.
 *
 * `defaultValue` is read on the first render only. `reasoning` depends on that:
 * it recomputes the value every render but expects only the first to count.
 *
 * The setter keeps its identity across any re-render that does not change the
 * value, including when `onChange` is a fresh closure each time. Consumers list
 * it in effect dependency arrays — `reasoning` restarts a one-second auto-close
 * timer whenever those deps change, so a setter that churned every render would
 * cancel the timer before it ever fired.
 */
export function useControllableState<T>({
	value,
	defaultValue,
	onChange
}: ControllableStateOptions<T>): [T, (next: T) => void] {
	const [uncontrolled, setUncontrolled] = useState(defaultValue);
	const isControlled = value !== undefined;
	const current = isControlled ? value : uncontrolled;

	const onChangeRef = useRef(onChange);

	// A ref cannot be written during render, and listing `onChange` as a setter
	// dependency instead would hand callers the churn this hook exists to avoid:
	// an inline arrow at the call site is a new function on every render.
	useEffect(() => {
		onChangeRef.current = onChange;
	});

	// Hand-written rather than left to the React Compiler because the identity
	// documented above is a correctness property, and the compiler is disabled
	// under test (`mode === 'test'` in vite.config.ts) — the property would go
	// unproven exactly where it is asserted.
	const setValue = useCallback(
		(next: T) => {
			if (next === current) return;
			if (!isControlled) setUncontrolled(next);
			onChangeRef.current?.(next);
		},
		[current, isControlled]
	);

	return [current, setValue];
}
