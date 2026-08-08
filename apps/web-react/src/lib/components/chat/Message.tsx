import type { UIMessage } from 'ai';
import type { HTMLAttributes } from 'react';

import { cn } from '../../utils/cn.ts';

export interface MessageProps extends HTMLAttributes<HTMLDivElement> {
	from: UIMessage['role'];
}

export function Message({ className, from, ...props }: MessageProps) {
	return (
		<div
			className={cn(
				'group flex w-full max-w-[95%] flex-col gap-2',
				from === 'user' ? 'is-user ml-auto justify-end' : 'is-assistant',
				className
			)}
			{...props}
		/>
	);
}
