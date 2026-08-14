import { DotMatrix } from '../assistant-ui/dot-matrix.tsx';

export interface ThinkingIndicatorProps {
	label: string;
}

/**
 * The gap between a turn being sent and the first token arriving.
 */
export function ThinkingIndicator({ label }: ThinkingIndicatorProps) {
	return (
		<div
			data-slot="thinking-indicator"
			className="flex items-center gap-2 text-sm text-muted-foreground"
			role="status"
		>
			{/*
			 * `DotMatrix` carries its own `role="status"` and an sr-only state name, which
			 * would announce a second time alongside the label this row already announces.
			 * Its props spread is last, so `aria-hidden` reaches the element; a `span` is
			 * not focusable, so hiding it takes nothing out of the tab order.
			 */}
			<DotMatrix aria-hidden state="loading" />
			{/*
			 * The registry wraps this in an `animate-in` entry animation, which cannot
			 * survive here: `shimmer` is itself an `animation`, so the two overwrite each
			 * other and only the later utility in the cascade runs.
			 */}
			<span className="inline-block shimmer leading-none motion-reduce:animate-none">{label}</span>
		</div>
	);
}
