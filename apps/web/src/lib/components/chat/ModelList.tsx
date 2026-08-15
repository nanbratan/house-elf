import { useVirtualizer, type Virtualizer } from '@tanstack/react-virtual';
import { useImperativeHandle, useState, type RefObject } from 'react';

import type { ModelListRow } from '../../utils/model-rows.ts';
import { ComboboxList } from '../ui/combobox.tsx';
import { ModelListHeading } from './ModelListHeading.tsx';
import { ModelRow } from './ModelRow.tsx';

export type ModelListVirtualizer = Virtualizer<HTMLDivElement, Element>;

/** `p-1.5` on the scroller below, in pixels — the two have to agree. */
const SCROLLER_PADDING = 6;

/**
 * Left clear beyond that padding when a row is scrolled to an edge, so it does
 * not read as stuck to the border.
 *
 * Two scrollers have to agree on it, and they measure differently. Stepping the
 * highlight is base-ui's to scroll, through `scrollIntoView`, which obeys the
 * CSS `scroll-py-1.5` below — CSS insets from the padding box, so the scroller's
 * own padding is already counted. Jumping to a row is ours, through the
 * virtualizer, whose option is a plain offset that knows nothing about that
 * padding, so there it has to be added on.
 */
const HIGHLIGHT_MARGIN = 6;

export interface ModelListProps {
	/** Headings and models as one flat sequence, in the order they are shown. */
	rows: readonly ModelListRow[];
	/** How many of those rows are models, for each row's `aria-setsize`. */
	itemCount: number;
	selectedModelId: string;
	/** The id of the row whose details are open, or null — an accordion. */
	detailsOpenId: string | null;
	pinnedCollapsed: boolean;
	/**
	 * Handed the virtualizer once it exists. base-ui can only scroll a row it
	 * has in the DOM, so the picker drives `scrollToIndex` itself when the
	 * highlight lands on one that is not mounted.
	 */
	virtualizerRef: RefObject<ModelListVirtualizer | null>;
	onToggleCollapsed: () => void;
	onTogglePin: (modelId: string) => void;
	onToggleDetails: (modelId: string) => void;
}

/**
 * The listbox itself: a window onto the rows the picker is showing.
 *
 * React Compiler skips this one component: `useVirtualizer` returns functions
 * whose identity changes every render, which the compiler cannot memoise
 * without risking stale UI, so it declines to try (`react-hooks/
 * incompatible-library`). Only this component's own JSX goes uncached —
 * `ModelPicker` above still compiles, so the row derivation and the callbacks
 * handed down here are memoised as usual.
 *
 * The cost is that the mounted window's rows are recreated whenever the picker
 * re-renders. Left as it is deliberately: measured in Chromium, `memo` on
 * `ModelRow` changes nothing — typing thirteen characters and clearing them
 * costs one 52ms long frame either way, and toggling a row's details twelve
 * times produces no long frame at all with or without it. A keystroke changes
 * every row, so nothing can be skipped, and thirty cheap rows do not reach the
 * measurement floor. Virtualization is what made that true; at the 413 rows
 * this list used to mount, it would not have been.
 */
export function ModelList({
	rows,
	itemCount,
	selectedModelId,
	detailsOpenId,
	pinnedCollapsed,
	virtualizerRef,
	onToggleCollapsed,
	onTogglePin,
	onToggleDetails
}: ModelListProps) {
	// State rather than a ref: the virtualizer needs a re-render once the
	// scroller exists, and a ref alone would not cause one.
	const [scroller, setScroller] = useState<HTMLDivElement | null>(null);

	const virtualizer = useVirtualizer({
		count: rows.length,
		getScrollElement: () => scroller,
		// Rows grow when their details open, so this is a starting guess that
		// `measureElement` corrects — never the height a row is drawn at.
		estimateSize: () => 40,
		// Keyed by the row, not by its slot: the size cache would otherwise hand
		// an expanded row's height to whatever occupies that index after the next
		// keystroke.
		getItemKey: (index) => rows[index]?.id ?? index,
		// Roughly a screenful either side of the window: enough that a fast scroll
		// does not show a gap, and no more. A jump does not need covering here —
		// the picker scrolls to it first, and the window follows.
		overscan: 10,
		// The scroller's own padding, plus room to breathe. Without the first,
		// scrolling a row to an edge lands it under the padding rather than
		// against it; without the second it sits flush against the border.
		scrollPaddingStart: SCROLLER_PADDING + HIGHLIGHT_MARGIN,
		scrollPaddingEnd: SCROLLER_PADDING + HIGHLIGHT_MARGIN
	});

	useImperativeHandle(virtualizerRef, () => virtualizer, [virtualizer]);

	const totalSize = virtualizer.getTotalSize();

	return (
		// The list is the scroller: one element rather than a scroller nested in it,
		// so the box can shrink to its rows and the dialog closes up around a short
		// result set. `scroll-py-1.5` is `HIGHLIGHT_MARGIN`, not the sum above —
		// CSS insets from the scrollport, which is the padding box, so the
		// scroller's own padding is already inside it.
		<ComboboxList
			ref={setScroller}
			aria-label="Models"
			className="max-h-none min-h-0 shrink scroll-py-1.5 overflow-y-auto overscroll-contain p-1.5"
		>
			{rows.length === 0 ? (
				// Not `Combobox.Empty`, which keys off the popup this composition
				// never renders.
				<p className="py-8 text-center text-faint">No models found.</p>
			) : (
				<div role="presentation" className="relative w-full" style={{ height: totalSize }}>
					{virtualizer.getVirtualItems().map((virtualRow) => {
						const row = rows[virtualRow.index];
						if (!row) return null;

						return (
							<div
								key={virtualRow.key}
								role="presentation"
								data-index={virtualRow.index}
								ref={virtualizer.measureElement}
								// No height of its own — the wrapper is what gets measured, so
								// fixing it here would freeze every row at the estimate.
								style={{
									position: 'absolute',
									top: 0,
									left: 0,
									width: '100%',
									transform: `translateY(${String(virtualRow.start)}px)`
								}}
							>
								{row.kind === 'heading' ? (
									<ModelListHeading
										title={row.title}
										collapsible={row.collapsible}
										collapsed={pinnedCollapsed}
										onToggleCollapsed={onToggleCollapsed}
									/>
								) : (
									<ModelRow
										model={row.model}
										selected={row.model.id === selectedModelId}
										pinned={row.pinned}
										detailsOpen={detailsOpenId === row.model.id}
										index={row.itemIndex}
										listedCount={itemCount}
										onTogglePin={onTogglePin}
										onToggleDetails={onToggleDetails}
									/>
								)}
							</div>
						);
					})}
				</div>
			)}
		</ComboboxList>
	);
}
