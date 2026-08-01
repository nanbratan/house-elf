/**
 * Whether a collapsible panel is showing its body, and — crucially — who decided.
 *
 * `follows` is not a third kind of closed: it means nobody has clicked yet, so
 * the panel is free to track whatever it is reporting on. The first click leaves
 * `follows` for good, so the panel stops moving on its own once someone has shown
 * an interest.
 *
 * The three states are private. Callers get a question and a verb.
 */
const decision = {
	follows: 'follows',
	expanded: 'expanded',
	collapsed: 'collapsed'
} as const;

type Decision = (typeof decision)[keyof typeof decision];

export interface Expansion {
	/** Whether the body should be on screen right now. */
	readonly isOpen: boolean;
	/** Answer a click: open what is closed, close what is open, and stay there. */
	toggle(): void;
}

/**
 * A panel that follows `subjectIsUnfinished` until someone clicks it.
 *
 * The argument is a function rather than a value because it is read reactively:
 * pass the expression itself, `() => tool.isRunning`, not its result.
 *
 * This file is `.svelte.ts` because runes only work in modules named that way —
 * it is the Svelte equivalent of a hook, and the compiler needs the hint.
 */
export function createExpansion(subjectIsUnfinished: () => boolean): Expansion {
	let decided = $state<Decision>(decision.follows);

	const isOpen = $derived(
		decided === decision.follows ? subjectIsUnfinished() : decided === decision.expanded
	);

	return {
		get isOpen() {
			return isOpen;
		},
		toggle() {
			decided = isOpen ? decision.collapsed : decision.expanded;
		}
	};
}
