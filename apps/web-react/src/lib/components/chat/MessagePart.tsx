import { getToolName, isReasoningUIPart, isTextUIPart, isToolUIPart } from 'ai';
import type { UIDataTypes, UIMessagePart, UITools } from 'ai';

import { partState } from '../../constants/part-state.ts';
import { MessageResponse } from './MessageResponse.tsx';
import { Shimmer } from '../vendor/ai-elements/shimmer.tsx';

export interface MessagePartProps {
	part: UIMessagePart<UIDataTypes, UITools>;
}

export function MessagePart({ part }: MessagePartProps) {
	if (isTextUIPart(part)) {
		return (
			<MessageResponse isAnimating={part.state === partState.streaming}>
				{part.text}
			</MessageResponse>
		);
	}

	if (isReasoningUIPart(part)) {
		return (
			<div className="rounded-lg border border-border/60 bg-muted/20 px-3 py-2 text-sm text-muted-foreground">
				<div className="mb-2 text-xs font-medium tracking-wide uppercase">
					{part.state === partState.streaming ? <Shimmer>Reasoning</Shimmer> : 'Reasoning'}
				</div>
				<MessageResponse isAnimating={part.state === partState.streaming}>
					{part.text}
				</MessageResponse>
			</div>
		);
	}

	if (isToolUIPart(part)) {
		const stateLabel = part.state.replaceAll('-', ' ');

		return (
			<div className="rounded-lg border border-border/60 bg-muted/20 px-3 py-2 text-sm text-muted-foreground">
				<p className="font-medium text-foreground">{getToolName(part)}</p>
				<p className="mt-1 text-xs">{'errorText' in part ? part.errorText : stateLabel}</p>
			</div>
		);
	}

	return null;
}
