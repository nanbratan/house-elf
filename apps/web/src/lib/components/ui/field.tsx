import { cva, type VariantProps } from 'class-variance-authority';
import type * as React from 'react';

import { cn } from '../../utils/cn.ts';
import { Label } from './label.tsx';

// Only vertical and horizontal. The registry's third orientation, `responsive`,
// keys entirely off `@md/field-group` — a container query that only FieldGroup
// opens, and FieldGroup is not part of this file.
const fieldVariants = cva('group/field flex w-full gap-2 data-[invalid=true]:text-destructive', {
	variants: {
		orientation: {
			vertical: 'flex-col *:w-full [&>.sr-only]:w-auto',
			horizontal:
				'flex-row items-center has-[>[data-slot=field-content]]:items-start *:data-[slot=field-label]:flex-auto has-[>[data-slot=field-content]]:[&>[role=checkbox],[role=radio]]:mt-px'
		}
	},
	defaultVariants: {
		orientation: 'vertical'
	}
});

// Default in the body, not the parameter pattern: the React Compiler cannot
// lower a destructuring default and bails out of the whole component.
export function Field({
	className,
	orientation,
	...props
}: React.ComponentProps<'div'> & VariantProps<typeof fieldVariants>) {
	const layout = orientation ?? 'vertical';

	return (
		<div
			role="group"
			data-slot="field"
			data-orientation={layout}
			className={cn(fieldVariants({ orientation: layout }), className)}
			{...props}
		/>
	);
}

export function FieldContent({ className, ...props }: React.ComponentProps<'div'>) {
	return (
		<div
			data-slot="field-content"
			className={cn('group/field-content flex flex-1 flex-col gap-0.5 leading-snug', className)}
			{...props}
		/>
	);
}

export function FieldLabel({ className, ...props }: React.ComponentProps<typeof Label>) {
	return (
		<Label
			data-slot="field-label"
			className={cn(
				'group/field-label peer/field-label flex w-fit gap-2 leading-snug group-data-[disabled=true]/field:opacity-50 has-data-checked:border-primary/30 has-data-checked:bg-primary/5 has-[>[data-slot=field]]:w-full has-[>[data-slot=field]]:flex-col has-[>[data-slot=field]]:rounded-lg has-[>[data-slot=field]]:border *:data-[slot=field]:p-2.5 dark:has-data-checked:border-primary/20 dark:has-data-checked:bg-primary/10',
				className
			)}
			{...props}
		/>
	);
}

// `text-xs text-faint` where the registry ships `text-sm text-muted-foreground`:
// a description is the app's third text tier, and matching the label's own
// `text-sm` would flatten the hierarchy the tokens exist to express.
export function FieldDescription({ className, ...props }: React.ComponentProps<'p'>) {
	return (
		<p
			data-slot="field-description"
			className={cn(
				'text-left text-xs leading-normal font-normal text-faint group-has-data-horizontal/field:text-balance [[data-variant=legend]+&]:-mt-1.5',
				'last:mt-0 nth-last-2:-mt-1',
				'[&>a]:underline [&>a]:underline-offset-4 [&>a:hover]:text-primary',
				className
			)}
			{...props}
		/>
	);
}
