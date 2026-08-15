import { cva, type VariantProps } from 'class-variance-authority';
import type * as React from 'react';

import { cn } from '../../utils/cn.ts';
import { Input } from './input.tsx';

function InputGroup({ className, ...props }: React.ComponentProps<'div'>) {
	return (
		<div
			data-slot="input-group"
			role="group"
			className={cn(
				'group/input-group relative flex h-8 w-full min-w-0 items-center rounded-lg border border-input transition-colors outline-none in-data-[slot=combobox-content]:focus-within:border-inherit in-data-[slot=combobox-content]:focus-within:ring-0 has-disabled:bg-input/50 has-disabled:opacity-50 has-[[data-slot=input-group-control]:focus-visible]:border-ring has-[[data-slot=input-group-control]:focus-visible]:ring-3 has-[[data-slot=input-group-control]:focus-visible]:ring-ring/50 has-[[data-slot][aria-invalid=true]]:border-destructive has-[[data-slot][aria-invalid=true]]:ring-3 has-[[data-slot][aria-invalid=true]]:ring-destructive/20 dark:bg-input/30 dark:has-disabled:bg-input/80 dark:has-[[data-slot][aria-invalid=true]]:ring-destructive/40 has-[>[data-align=inline-end]]:[&>input]:pr-1.5 has-[>[data-align=inline-start]]:[&>input]:pl-1.5',
				className
			)}
			{...props}
		/>
	);
}

// Only the inline aligns: the block variants also need matching
// `has-[>[data-align=block-*]]` rules on InputGroup, and nothing imports them.
const inputGroupAddonVariants = cva(
	"flex h-auto cursor-text items-center justify-center gap-2 py-1.5 text-sm font-medium text-muted-foreground select-none group-data-[disabled=true]/input-group:opacity-50 [&>svg:not([class*='size-'])]:size-4",
	{
		variants: {
			align: {
				'inline-start': 'order-first pl-2 has-[>button]:ml-[-0.3rem]',
				'inline-end': 'order-last pr-2 has-[>button]:mr-[-0.3rem]'
			}
		},
		defaultVariants: {
			align: 'inline-start'
		}
	}
);

// Default in the body, not the parameter pattern: the React Compiler cannot
// lower a destructuring default and bails out of the whole component.
function InputGroupAddon({
	className,
	align,
	...props
}: React.ComponentProps<'div'> & VariantProps<typeof inputGroupAddonVariants>) {
	const alignment = align ?? 'inline-start';

	return (
		<div
			role="group"
			data-slot="input-group-addon"
			data-align={alignment}
			className={cn(inputGroupAddonVariants({ align: alignment }), className)}
			onClick={(event) => {
				if (event.target instanceof Element && event.target.closest('button')) return;
				event.currentTarget.parentElement?.querySelector('input')?.focus();
			}}
			{...props}
		/>
	);
}

function InputGroupInput({ className, ...props }: React.ComponentProps<'input'>) {
	return (
		<Input
			data-slot="input-group-control"
			className={cn(
				'flex-1 rounded-none border-0 bg-transparent shadow-none ring-0 focus-visible:ring-0 disabled:bg-transparent aria-invalid:ring-0 dark:bg-transparent dark:disabled:bg-transparent',
				className
			)}
			{...props}
		/>
	);
}

export { InputGroup, InputGroupAddon, InputGroupInput };
