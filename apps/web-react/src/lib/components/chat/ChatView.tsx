import { useChat } from '@ai-sdk/react';
import type { ModelCatalog } from '@house-elf/shared';
import { DefaultChatTransport } from 'ai';
import type { ChangeEvent, KeyboardEvent, SyntheticEvent } from 'react';
import { useState } from 'react';

import { chatStatus } from '../../constants/chat-status.ts';
import { Button } from '@/registry/default/ui/button';
import { MessageTranscript } from './MessageTranscript.tsx';

export interface ChatViewProps {
	agentId: string;
	modelCatalog: ModelCatalog;
}

export function ChatView({ agentId, modelCatalog }: ChatViewProps) {
	return <ChatSession key={agentId} agentId={agentId} modelCatalog={modelCatalog} />;
}

function ChatSession({ agentId, modelCatalog }: ChatViewProps) {
	const [transport] = useState(
		() =>
			new DefaultChatTransport({
				api: `/api/chat/${agentId}`,
				body: { model: modelCatalog.initialModelId, thinking: false }
			})
	);
	const chat = useChat({ transport });
	const [draft, setDraft] = useState('');
	const [isComposing, setIsComposing] = useState(false);
	const busy = chat.status === chatStatus.submitted || chat.status === chatStatus.streaming;
	const canSend = draft.trim().length > 0 && !busy;

	function sendMessage() {
		const text = draft.trim();
		if (text.length === 0 || busy) {
			return;
		}

		setDraft('');
		void chat.sendMessage({ text });
	}

	function handleSubmit(event: SyntheticEvent<HTMLFormElement>) {
		event.preventDefault();
		sendMessage();
	}

	function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
		if (event.key !== 'Enter' || event.shiftKey || isComposing) {
			return;
		}

		event.preventDefault();
		sendMessage();
	}

	function retry() {
		void chat.regenerate();
	}

	function handleCompositionStart() {
		setIsComposing(true);
	}

	function handleCompositionEnd() {
		setIsComposing(false);
	}

	function handleDraftChange(event: ChangeEvent<HTMLTextAreaElement>) {
		setDraft(event.target.value);
	}

	function stop() {
		void chat.stop();
	}

	return (
		<div className="flex h-full min-h-0 flex-col">
			<MessageTranscript
				error={chat.error}
				messages={chat.messages}
				onRetry={retry}
				status={chat.status}
			/>

			<form className="border-t border-border px-4 py-3" onSubmit={handleSubmit}>
				<div className="mx-auto flex max-w-3xl items-end gap-3 rounded-xl border border-border bg-card p-3">
					<textarea
						aria-label="Message"
						className="min-h-24 flex-1 resize-none bg-transparent text-sm outline-none placeholder:text-faint"
						onChange={handleDraftChange}
						onCompositionEnd={handleCompositionEnd}
						onCompositionStart={handleCompositionStart}
						onKeyDown={handleKeyDown}
						placeholder="Send a message…"
						rows={3}
						value={draft}
					/>
					{busy ? (
						<Button onClick={stop} type="button" variant="outline">
							Stop
						</Button>
					) : (
						<Button disabled={!canSend} type="submit">
							Send
						</Button>
					)}
				</div>
			</form>
		</div>
	);
}
