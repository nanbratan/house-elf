import { InfoIcon } from 'lucide-react';

import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover.tsx';

export interface FieldHintProps {
	/** Which setting this explains, for the accessible name. */
	setting: string;
	children: string;
}

/**
 * What one setting does, behind an info icon.
 *
 * A popover on click, not a tooltip: base-ui's tooltip uses `useHover`, which
 * ignores touch pointers, leaving the text unreachable on a phone.
 */
export function FieldHint({ setting, children }: FieldHintProps) {
	return (
		<Popover>
			<PopoverTrigger
				aria-label={`About ${setting}`}
				className="rounded-full text-faint transition-colors hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-hidden"
			>
				<InfoIcon className="size-3.5" aria-hidden="true" />
			</PopoverTrigger>

			<PopoverContent side="top" align="start" className="w-56 p-2.5 text-xs leading-normal">
				{children}
			</PopoverContent>
		</Popover>
	);
}
