import { SlidersHorizontalIcon } from 'lucide-react';

import { cn } from '../../utils/cn.ts';
import type { SettingsSummary } from '../../utils/settings-summary.ts';
import { PopoverTrigger } from '../ui/popover.tsx';
import { Skeleton } from '../ui/skeleton.tsx';

export interface SettingsPickerTriggerProps {
	/** False until storage has been read, when a skeleton stands in for the summary. */
	restored: boolean;
	summary: SettingsSummary;
}

/**
 * The composer's settings button.
 *
 * Before the restore lands the client cannot know what is set, so the summary
 * slot is a skeleton rather than a word that would have to be corrected.
 */
export function SettingsPickerTrigger({ restored, summary }: SettingsPickerTriggerProps) {
	return (
		<PopoverTrigger
			// Uncapped, unlike the tokens.
			aria-label={restored ? summary.label : 'Settings'}
			className="flex h-8 min-w-0 items-center gap-1.5 rounded-md px-2 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
		>
			<SlidersHorizontalIcon className="size-3.5 shrink-0" aria-hidden="true" />

			{restored ? (
				<span aria-hidden="true" className="flex min-w-0 items-center">
					{summary.tokens.length === 0 ? (
						<span>Settings</span>
					) : (
						/*
						 * One token on a phone, all of them once there is room: the full
						 * list truncated mid-word, turning `Medium effort` into what read
						 * as a different level. The separator is a pseudo-element so the
						 * list stays a plain map with a stable key.
						 */
						summary.tokens.map((token, position) => (
							<span
								key={token}
								className={cn(
									'truncate before:mx-1.5 before:text-faint before:content-["·"] first:before:content-none',
									position === 0 ? '' : 'hidden sm:inline'
								)}
							>
								{token}
							</span>
						))
					)}
					{summary.tokens.length > 1 ? (
						<span className="ms-1.5 shrink-0 text-faint sm:hidden">
							+{String(summary.tokens.length - 1)}
						</span>
					) : null}
				</span>
			) : (
				<Skeleton className="h-3 w-14" />
			)}
		</PopoverTrigger>
	);
}
