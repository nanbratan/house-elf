import { ChevronDownIcon } from 'lucide-react';

import {
	DropdownMenu,
	DropdownMenuCheckboxItem,
	DropdownMenuContent,
	DropdownMenuTrigger
} from '../ui/dropdown-menu.tsx';

export interface FilterOption {
	readonly value: string;
	readonly label: string;
	/** Shown greyed beside the label — a count, a caveat, anything secondary. */
	readonly hint?: string;
}

export interface FilterSelectProps {
	label: string;
	options: readonly FilterOption[];
	value: readonly string[];
	onValueChange: (value: string[]) => void;
}

/**
 * A multi-select filter row, rendered as a checkbox menu.
 *
 * A `Select` cannot multi-select — base-ui's declares `value` as a single
 * item, with no equivalent of bits-ui's `type="multiple"` — so a `DropdownMenu`
 * of `CheckboxItem`s stands in. A multi-select filter with independently
 * checked options is a checkbox menu, not a listbox.
 */
export function FilterSelect({ label, options, value, onValueChange }: FilterSelectProps) {
	function toggle(optionValue: string) {
		onValueChange(
			value.includes(optionValue) ? value.filter((v) => v !== optionValue) : [...value, optionValue]
		);
	}

	return (
		<DropdownMenu>
			<DropdownMenuTrigger
				aria-label={label}
				className="flex items-center gap-1.5 rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:text-foreground data-[popup-open]:border-ring"
			>
				<span>{label}</span>
				{value.length > 0 ? (
					<span className="rounded-full bg-primary px-1.5 text-[0.625rem] text-primary-foreground">
						{value.length}
					</span>
				) : null}
				<ChevronDownIcon className="size-3 text-faint" aria-hidden="true" />
			</DropdownMenuTrigger>
			<DropdownMenuContent align="start" sideOffset={6} className="w-48">
				{options.map((option) => (
					<DropdownMenuCheckboxItem
						key={option.value}
						checked={value.includes(option.value)}
						onCheckedChange={() => {
							toggle(option.value);
						}}
						// Picking a checkbox item closes the menu by default; a
						// multi-select filter should stay open so the reader can pick
						// more than one without reopening it.
						closeOnClick={false}
					>
						<span className="flex-1 truncate">{option.label}</span>
						{option.hint ? <span className="text-xs text-faint">{option.hint}</span> : null}
					</DropdownMenuCheckboxItem>
				))}
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
