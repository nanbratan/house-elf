import type { SelectableModel } from '@house-elf/shared';
import { SearchIcon, XIcon } from 'lucide-react';
import { useRef } from 'react';

import type { ModelFilters as Filters } from '../../utils/model-filters.ts';
import { CommandInput } from '../ui/command.tsx';
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
 * The search box is named by the enclosing `Command`'s `label` prop — cmdk
 * writes `aria-labelledby` after spreading our props, so an `aria-label` here
 * would be computed away.
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
				{/* Home and End move the list highlight, not the caret: cmdk's root
				    preventDefaults both. The list is what this box drives. */}
				<CommandInput
					ref={inputRef}
					value={search}
					onValueChange={onSearchChange}
					placeholder="Search models…"
				/>
				<InputGroupAddon align="inline-end">
					<span aria-live="polite" className="shrink-0 text-xs text-faint">
						{countLabel}
					</span>
					{/* cmdk forces `type="text"`, so the native search-field clear is gone. */}
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
