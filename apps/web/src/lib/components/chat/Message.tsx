import type { UIMessage } from 'ai';
import type { HTMLAttributes } from 'react';

import { cn } from '../../utils/cn.ts';

export interface MessageProps extends HTMLAttributes<HTMLElement> {
	from: UIMessage['role'];
}

/**
 * An `article`, not a `div`: it is one self-contained turn of the conversation,
 * and `data-role` is what the e2e suite locates a turn by (tests/e2e/chat-stream.spec.ts).
 */
export function Message({ className, from, ...props }: MessageProps) {
	return (
		<article
			className={cn(
				'group flex w-full max-w-[95%] flex-col gap-2',
				from === 'user' ? 'is-user ml-auto justify-end' : 'is-assistant',
				className
			)}
			data-role={from}
			{...props}
		/>
	);
}
