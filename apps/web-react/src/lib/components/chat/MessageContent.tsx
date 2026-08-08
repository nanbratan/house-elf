import type { HTMLAttributes } from 'react';

import { cn } from '../../utils/cn.ts';

export type MessageContentProps = HTMLAttributes<HTMLDivElement>;

export function MessageContent({ children, className, ...props }: MessageContentProps) {
	return (
		<div
			className={cn(
				'is-user:dark flex w-fit max-w-full min-w-0 flex-col gap-2 overflow-hidden text-sm',
				'group-[.is-user]:ml-auto group-[.is-user]:rounded-lg group-[.is-user]:bg-secondary group-[.is-user]:px-4 group-[.is-user]:py-3 group-[.is-user]:text-foreground',
				'group-[.is-assistant]:text-foreground',
				className
			)}
			{...props}
		>
			{children}
		</div>
	);
}
