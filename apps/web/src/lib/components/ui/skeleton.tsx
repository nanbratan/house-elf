import type * as React from 'react';

import { cn } from '../../utils/cn.ts';

/** A placeholder the size of the thing it stands in for, until that thing is known. */
export function Skeleton({ className, ...props }: React.ComponentProps<'div'>) {
	return (
		<div
			data-slot="skeleton"
			className={cn('animate-pulse rounded-md bg-muted', className)}
			{...props}
		/>
	);
}
