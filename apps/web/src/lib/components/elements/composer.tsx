import type { ComponentProps } from 'react';
import { ArrowUpIcon, SquareIcon } from 'lucide-react';

import { cn } from '../../utils/cn.ts';
import { iconSwap, iconSwapIn, iconSwapOut, inkButton, paper } from './surfaces.tsx';

/**
 * The card the composer's parts sit in — the registry's own, with one addition.
 *
 * The registry leaves focus entirely to the input, and the input it ships with
 * sets `outline-none`, so a keyboard user is given nothing to see. The border
 * and its focus states are assistant-ui's own docs composer, which brightens the
 * edge and deepens the shadow rather than drawing a ring. In dark mode `paper`
 * drops the shadow, so there the border carries the whole signal.
 */
export function ComposerBar({ className, ...props }: ComponentProps<'div'>) {
	return (
		<div
			data-slot="composer-bar"
			className={cn(
				paper,
				'flex w-full flex-col gap-2 rounded-[24px] border border-border/60 p-2.5',
				'transition-[border-color,box-shadow] dark:border-muted-foreground/15',
				'focus-within:border-border focus-within:shadow-[0_6px_24px_-8px_rgba(0,0,0,0.12),0_1px_2px_rgba(0,0,0,0.05)]',
				'dark:focus-within:border-muted-foreground/30 dark:focus-within:shadow-none',
				className
			)}
			{...props}
		/>
	);
}

export function ComposerToolbar({ className, ...props }: ComponentProps<'div'>) {
	return (
		<div
			data-slot="composer-toolbar"
			className={cn('flex items-center justify-between', className)}
			{...props}
		/>
	);
}

export function ComposerActions({ className, ...props }: ComponentProps<'div'>) {
	return (
		<div
			data-slot="composer-actions"
			className={cn('flex items-center gap-1.5', className)}
			{...props}
		/>
	);
}

export type ComposerSendProps = Omit<ComponentProps<'button'>, 'children'> & {
	/** Renders the stop square instead of the send arrow. */
	streaming: boolean;
	/** Nothing to send yet: the button rests grey rather than inked. */
	idle: boolean;
};

export function ComposerSend({ streaming, idle, className, ...props }: ComposerSendProps) {
	return (
		<button
			type="button"
			aria-label={streaming ? 'Stop generating' : 'Send message'}
			data-slot="composer-send"
			className={cn(
				'grid size-8 place-items-center rounded-full',
				streaming || !idle
					? inkButton
					: 'bg-foreground/[0.06] text-foreground/30 transition-colors dark:bg-foreground/[0.09]',
				className
			)}
			{...props}
		>
			<ArrowUpIcon className={cn(iconSwap, 'size-4', streaming ? iconSwapOut : iconSwapIn)} />
			<SquareIcon
				className={cn(iconSwap, 'size-3 fill-current', streaming ? iconSwapIn : iconSwapOut)}
			/>
		</button>
	);
}
