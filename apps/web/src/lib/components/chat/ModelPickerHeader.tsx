import type { SelectableModel } from '@house-elf/shared';
import { SearchIcon, XIcon } from 'lucide-react';
import { useRef } from 'react';

import type { ModelFilters as Filters } from '../../utils/model-filters.ts';
import { ComboboxInputControl } from '../ui/combobox.tsx';
import { InputGroup, InputGroupAddon } from '../ui/input-group.tsx';
import { ModelFilters } from './ModelFilters.tsx';

export interface ModelPickerHeaderProps {
	search: string;
	onSearchChange: (search: string) => void;
	countLabel: string;
	/** The whole catalog, not the narrowed list, so a filter never vanishes the moment it is used. */
	models: readonly SelectableModel[];
	filters: Filters;
	onFiltersChange: (filters: Filters) => void;
}

/**
 * The search box, live count and filter trigger above the model list.
 *
 * The box reads and writes the enclosing `Combobox.Root`'s input value, so the
 * `search` prop here is only what the clear button needs to know.
 */
export function ModelPickerHeader({
	search,
	onSearchChange,
	countLabel,
	models,
	filters,
	onFiltersChange
}: ModelPickerHeaderProps) {
	const inputRef = useRef<HTMLInputElement>(null);

	function clearSearch() {
		onSearchChange('');
		inputRef.current?.focus();
	}

	return (
		<div className="flex flex-wrap items-center gap-2 border-b border-border px-3 py-2">
			{/* `ring-0`: this input holds focus the whole time the dialog is open, so
			    the group's default ring is a second border, not a focus cue. */}
			<InputGroup className="h-9 w-auto min-w-0 flex-1 basis-48 border-input/30 bg-input/30 has-[[data-slot=input-group-control]:focus-visible]:ring-0">
				<InputGroupAddon align="inline-start">
					<SearchIcon className="shrink-0 text-faint" aria-hidden="true" />
				</InputGroupAddon>
				{/* Named here rather than by the dialog: `DialogTitle` names the dialog,
				    and this box needs a name of its own. base-ui writes `role="combobox"`
				    and the `aria-controls` pointing at the list. */}
				<ComboboxInputControl
					ref={inputRef}
					aria-label="Search models"
					placeholder="Search models…"
				/>
				<InputGroupAddon align="inline-end">
					<span aria-live="polite" className="shrink-0 text-xs text-faint">
						{countLabel}
					</span>
					{/* Ours, not `Combobox.Clear`: in single-select mode that clears the
					    selected model rather than the query. */}
					{search === '' ? null : (
						<button
							type="button"
							onClick={clearSearch}
							aria-label="Clear search"
							className="flex size-6 shrink-0 items-center justify-center rounded-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
						>
							<XIcon className="size-3.5" aria-hidden="true" />
						</button>
					)}
				</InputGroupAddon>
			</InputGroup>
			{/* Outside the group: an addon swallows clicks to focus the group's first
			    `<input>`, which is the search box — and ModelFilters' Combobox trigger
			    is itself an `<input>`, so nesting it would misdirect that click. */}
			<ModelFilters models={models} filters={filters} onChange={onFiltersChange} />
		</div>
	);
}
