import type { SelectableModel } from '@house-elf/shared';
import { useRef, useState } from 'react';

import { usePinnedModels } from '../../hooks/pinned-models.ts';
import {
	filterModels,
	noFilters,
	type ModelFilters as Filters
} from '../../utils/model-filters.ts';
import { pinnedModels, releaseSections, searchSections } from '../../utils/model-list.ts';
import { modelRows } from '../../utils/model-rows.ts';
import { Combobox } from '../ui/combobox.tsx';
import { Dialog, DialogContent, DialogTitle } from '../ui/dialog.tsx';
import { ModelList, type ModelListVirtualizer } from './ModelList.tsx';
import { ModelPickerHeader } from './ModelPickerHeader.tsx';
import { ModelPickerTrigger } from './ModelPickerTrigger.tsx';

export interface ModelPickerProps {
	models: readonly SelectableModel[];
	selectedModelId: string;
	onSelect: (modelId: string) => void;
}

/**
 * Which model answers, and nothing else. How it answers is the settings
 * picker's, so that a list the reader is scanning by name is not also a form.
 */
export function ModelPicker({ models, selectedModelId, onSelect }: ModelPickerProps) {
	const pins = usePinnedModels(models);

	const [open, setOpen] = useState(false);
	const [search, setSearch] = useState('');
	const [filters, setFilters] = useState<Filters>(noFilters);
	// One details panel open at a time — an accordion, so the list does not
	// grow a second scroll inside itself.
	const [detailsOpenId, setDetailsOpenId] = useState<string | null>(null);
	const virtualizerRef = useRef<ModelListVirtualizer | null>(null);

	const searching = search.trim() !== '';

	const selectedModel = models.find((model) => model.id === selectedModelId);
	const listed = filterModels(models, filters);

	// A pinned model renders in the pinned block, not the browse list: two items
	// sharing one value would leave the selected index ambiguous. Search still
	// sees pinned ids — a pin is a model the reader can look up by name.
	//
	// Drawn from the filtered list, not the catalog: a pin is a shortcut to a
	// model, not an exemption from the question the reader just asked, and a pin
	// sitting above the results reads as having answered it.
	const pinned = pinnedModels(listed, pins.pinnedIds);
	const pinnedIdSet = new Set(pinned.map((model) => model.id));
	const browseList = listed.filter((model) => !pinnedIdSet.has(model.id));

	// Built once per catalog, filters and pins — never per keystroke. It is what
	// the combobox navigates while closed, and the picker always opens on an
	// empty query, so this is also the order the highlight is seeded against.
	const browse = modelRows({
		sections: releaseSections(browseList),
		pinned,
		pinnedIds: pins.pinnedIds,
		pinnedCollapsed: pins.collapsed
	});

	const view = searching
		? modelRows({
				sections: searchSections(listed, search),
				pinned: [],
				pinnedIds: pins.pinnedIds,
				pinnedCollapsed: pins.collapsed
			})
		: browse;

	// What the list can navigate to, for each row's `aria-setsize`.
	const itemCount = view.items.length;
	// What the reader was shown, which a fold does not change: the count answers
	// the search and the filters, not the state of a section the reader closed.
	const shownCount = itemCount + (!searching && pins.collapsed ? pinned.length : 0);
	const countLabel = shownCount === 1 ? '1 model' : `${String(shownCount)} models`;

	function selectModel(model: SelectableModel | null) {
		if (!model) return;
		setSearch('');
		onSelect(model.id);
	}

	function togglePin(modelId: string) {
		pins.toggle(modelId);
	}

	function toggleCollapsed() {
		pins.toggleCollapsed();
	}

	/**
	 * Scrolls a highlight base-ui cannot reach itself.
	 *
	 * base-ui scrolls by moving the highlighted element, which exists only while
	 * that row is inside the mounted window. That covers stepping through the
	 * list, but not the two jumps: `none` is the programmatic highlight the
	 * picker seeds on open, and a keyboard highlight at either end is the wrap
	 * from one end of the list to the other. Both can land far outside the
	 * window, so both are ours to scroll to.
	 */
	function scrollHighlightIntoView(
		model: SelectableModel | undefined,
		{ reason, index }: { reason: string; index: number }
	) {
		const virtualizer = virtualizerRef.current;
		if (!model || !virtualizer) return;

		const isEnd = index === view.items.length - 1;
		const jumped = reason === 'none' || (reason === 'keyboard' && (index === 0 || isEnd));
		if (!jumped) return;

		// The highlight counts models; the virtualizer counts rows, headings and
		// all, so the index has to be translated before it means anything here.
		const rowIndex = view.rowIndexByItem[index];
		if (rowIndex === undefined) return;

		queueMicrotask(() => {
			virtualizer.scrollToIndex(rowIndex, { align: isEnd ? 'start' : 'end' });
		});
	}

	function toggleDetails(modelId: string) {
		setDetailsOpenId((current) => (current === modelId ? null : modelId));
	}

	return (
		<Combobox
			inline
			virtualized
			onItemHighlighted={scrollHighlightIntoView}
			open={open}
			// Bound to the dialog's own state, as the `inline` composition requires:
			// that is what resets the query and the highlight when the dialog closes.
			onOpenChange={setOpen}
			items={browse.items}
			// Ours overrides base-ui's own filtering, so the ranking survives.
			filteredItems={view.items}
			value={selectedModel ?? null}
			onValueChange={selectModel}
			itemToStringLabel={(model: SelectableModel) => model.label}
			inputValue={search}
			onInputValueChange={setSearch}
		>
			<Dialog open={open} onOpenChange={setOpen}>
				<ModelPickerTrigger label={selectedModel?.label ?? null} />

				<DialogContent
					showCloseButton={false}
					// `max-h`, not `h`: a search that matches two models should leave a
					// dialog the height of two models, not a tall box mostly empty.
					className="flex max-h-[min(30rem,80vh)] w-model-picker max-w-[calc(100vw-2rem)] flex-col gap-0 overflow-hidden p-0"
				>
					<DialogTitle className="sr-only">Choose a model</DialogTitle>

					<ModelPickerHeader
						search={search}
						onSearchChange={setSearch}
						countLabel={countLabel}
						models={models}
						filters={filters}
						onFiltersChange={setFilters}
					/>

					<ModelList
						rows={view.rows}
						itemCount={itemCount}
						selectedModelId={selectedModelId}
						detailsOpenId={detailsOpenId}
						pinnedCollapsed={pins.collapsed}
						virtualizerRef={virtualizerRef}
						onToggleCollapsed={toggleCollapsed}
						onTogglePin={togglePin}
						onToggleDetails={toggleDetails}
					/>
				</DialogContent>
			</Dialog>
		</Combobox>
	);
}
