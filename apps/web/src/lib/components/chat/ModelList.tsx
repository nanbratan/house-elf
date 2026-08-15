import { useVirtualizer, type Virtualizer } from '@tanstack/react-virtual';
import { useImperativeHandle, useState, type RefObject } from 'react';

import type { ModelListRow } from '../../utils/model-rows.ts';
import { ComboboxList } from '../ui/combobox.tsx';
import { ModelListHeading } from './ModelListHeading.tsx';
import { ModelRow } from './ModelRow.tsx';

export type ModelListVirtualizer = Virtualizer<HTMLDivElement, Element>;

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

/** The listbox itself: a window onto the rows the picker is showing. */
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
		// Generous, so a highlight that jumps — on open, or wrapping past the end —
		// lands on a row that is already mounted and can be pressed.
		overscan: 20
	});

	useImperativeHandle(virtualizerRef, () => virtualizer, [virtualizer]);

	const totalSize = virtualizer.getTotalSize();

	return (
		<ComboboxList aria-label="Models" className="max-h-none min-h-0 flex-1 overflow-hidden p-0">
			{rows.length === 0 ? (
				// Not `Combobox.Empty`, which keys off the popup this composition
				// never renders.
				<p className="px-3 py-8 text-faint">No models found.</p>
			) : (
				<div
					role="presentation"
					ref={setScroller}
					className="h-full overflow-y-auto overscroll-contain p-1.5"
				>
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
				</div>
			)}
		</ComboboxList>
	);
}
