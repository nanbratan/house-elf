import { isReasoningUIPart, isTextUIPart, isToolUIPart } from 'ai';
import type { UIDataTypes, UIMessagePart, UITools } from 'ai';

import { partState } from '../../constants/part-state.ts';
import { MessageResponse } from './MessageResponse.tsx';
import { Reasoning, ReasoningContent, ReasoningTrigger } from '../vendor/ai-elements/reasoning.tsx';
import {
	Tool,
	ToolContent,
	ToolHeader,
	ToolInput,
	ToolOutput
} from '../vendor/ai-elements/tool.tsx';

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
			<Reasoning isStreaming={part.state === partState.streaming}>
				<ReasoningTrigger />
				<ReasoningContent>{part.text}</ReasoningContent>
			</Reasoning>
		);
	}

	if (isToolUIPart(part)) {
		return (
			<Tool>
				{part.type === 'dynamic-tool' ? (
					<ToolHeader type={part.type} state={part.state} toolName={part.toolName} />
				) : (
					<ToolHeader type={part.type} state={part.state} />
				)}
				<ToolContent>
					{/* JSON.stringify(undefined) crashes CodeBlock's tokenizer; the first
					input-streaming chunk arrives before any argument text does. */}
					{part.input !== undefined && <ToolInput input={part.input} />}
					<ToolOutput output={part.output} errorText={part.errorText} />
				</ToolContent>
			</Tool>
		);
	}

	return null;
}
