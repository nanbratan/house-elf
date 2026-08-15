import type { SelectableModel } from '@house-elf/shared';

import type { ModelFilters as Filters } from '../../utils/model-filters.ts';
import { ModelFilters } from './ModelFilters.tsx';

export interface ModelPickerHeaderProps {
	search: string;
	onSearchChange: (search: string) => void;
	/** The id of the listbox this combobox drives. */
	listId: string;
	/** Live count of what is on the list, announced before the reader scrolls. */
	countLabel: string;
	/** The whole catalog for the filter row — not the narrowed list, so a filter never vanishes the moment it is used. */
	models: readonly SelectableModel[];
	/** What the list is narrowed to. Owned by the picker, which outlives this row. */
	filters: Filters;
	onFiltersChange: (filters: Filters) => void;
}

/** The search box, live count and filter trigger above the model list. */
export function ModelPickerHeader({
	search,
	onSearchChange,
	listId,
	countLabel,
	models,
	filters,
	onFiltersChange
}: ModelPickerHeaderProps) {
	return (
		<div className="flex flex-wrap items-center gap-2 border-b border-border px-3">
			<svg
				className="size-4 shrink-0 text-faint"
				viewBox="0 0 16 16"
				fill="none"
				stroke="currentColor"
				strokeWidth={1.5}
				aria-hidden="true"
			>
				<circle cx="7" cy="7" r="4.5" />
				<path d="m10.5 10.5 3 3" />
			</svg>
			<input
				type="search"
				value={search}
				onChange={(event) => {
					onSearchChange(event.target.value);
				}}
				role="combobox"
				aria-label="Search models"
				aria-controls={listId}
				aria-expanded="true"
				aria-haspopup="listbox"
				autoComplete="off"
				placeholder="Search models…"
				className="h-11 min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-faint"
			/>
			<span aria-live="polite" className="shrink-0 text-xs text-faint">
				{countLabel}
			</span>
			<ModelFilters models={models} filters={filters} onChange={onFiltersChange} />
		</div>
	);
}
