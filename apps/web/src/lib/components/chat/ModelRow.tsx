import type { SelectableModel } from '@house-elf/shared';
import { CheckIcon, StarIcon } from 'lucide-react';
import type { KeyboardEvent, MouseEvent } from 'react';

import { providerName } from '../../utils/model-list.ts';
import { CommandItem } from '../ui/command.tsx';
import { ModelDetails } from './ModelDetails.tsx';

export interface ModelRowProps {
	model: SelectableModel;
	selected: boolean;
	pinned: boolean;
	detailsOpen: boolean;
	onTogglePin: (modelId: string) => void;
	onToggleDetails: (modelId: string) => void;
	onSelect: (modelId: string) => void;
}

/**
 * Stops a click or keypress from reaching the row's own `onSelect` — cmdk
 * selects the row when a nested button's click bubbles up.
 */
function stopRowSelect(event: MouseEvent | KeyboardEvent) {
	event.stopPropagation();
}

export function ModelRow({
	model,
	selected,
	pinned,
	detailsOpen,
	onTogglePin,
	onToggleDetails,
	onSelect
}: ModelRowProps) {
	return (
		<CommandItem
			value={model.id}
			onSelect={() => {
				onSelect(model.id);
			}}
			aria-label={model.label}
			// `gap-0` is load-bearing: it overrides CommandItem's own `gap-2`, which
			// would otherwise space the label row away from the details wrapper below
			// it — a wrapper that is present even when the details are closed.
			className="flex flex-col items-stretch gap-0 rounded-lg px-2 py-2 text-sm"
		>
			<div className="flex items-center gap-2">
				<img
					alt={`${providerName(model)} logo`}
					className="size-3 dark:invert"
					height={12}
					width={12}
					src={`https://models.dev/logos/${providerName(model)}.svg`}
				/>
				<span className="min-w-0 flex-1 truncate">{model.label}</span>
				{selected ? (
					<CheckIcon className="size-4 shrink-0 text-foreground" aria-hidden="true" />
				) : null}
				{/* The star is always visible, not revealed on hover — a hover target
				    does not exist for a keyboard user. */}
				<span onClick={stopRowSelect} onKeyDown={stopRowSelect}>
					<button
						type="button"
						onClick={() => {
							onTogglePin(model.id);
						}}
						aria-pressed={pinned}
						aria-label={pinned ? `Unpin ${model.label}` : `Pin ${model.label}`}
						className="flex size-4 shrink-0 items-center justify-center text-muted-foreground transition-colors hover:text-foreground"
					>
						<StarIcon
							className="size-4"
							aria-hidden="true"
							fill={pinned ? 'currentColor' : 'none'}
						/>
					</button>
				</span>
				{/* "More" sits at the far right edge so a thumb finds it in the same
				    place on every row. The label is flex-1, so it absorbs the space
				    the checkmark takes on the selected row — "More" never shifts.
				    The literal space keeps the row's text content two words.

				    The button is `flex`, not the default `inline-block`: an
				    inline-level button is baseline-aligned inside its wrapper span's
				    line box, which sat it a pixel below everything else in the row.
				    The star reads as centred because it is already `flex`. */}{' '}
				<span onClick={stopRowSelect} onKeyDown={stopRowSelect}>
					<button
						type="button"
						onClick={() => {
							onToggleDetails(model.id);
						}}
						aria-expanded={detailsOpen}
						className="flex shrink-0 items-center text-xs text-muted-foreground transition-colors hover:text-foreground"
					>
						{detailsOpen ? 'Less' : 'More'}
					</button>
				</span>
			</div>
			{/* Details live inside the row so they move with it. */}
			<div onClick={stopRowSelect} onKeyDown={stopRowSelect}>
				<ModelDetails model={model} open={detailsOpen} />
			</div>
		</CommandItem>
	);
}
