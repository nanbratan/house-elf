import type { HTMLAttributes } from 'react';

import { cn } from '../../utils/cn.ts';

export type MessageContentProps = HTMLAttributes<HTMLDivElement>;

export function MessageContent({ children, className, ...props }: MessageContentProps) {
	return (
		<div
			className={cn(
				'is-user:dark flex max-w-full min-w-0 flex-col gap-2 overflow-hidden text-sm',
				// A user bubble hugs its own text, right-aligned. An assistant message
				// stretches full width instead, so a vendor Tool card's own `w-full`
				// has the whole column to fill rather than shrinking to its header's
				// natural content width.
				'group-[.is-user]:ml-auto group-[.is-user]:w-fit group-[.is-user]:rounded-lg group-[.is-user]:bg-secondary group-[.is-user]:px-4 group-[.is-user]:py-3 group-[.is-user]:text-foreground',
				'group-[.is-assistant]:w-full group-[.is-assistant]:text-foreground',
				className
			)}
			{...props}
		>
			{children}
		</div>
	);
}
