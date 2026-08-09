import { useChat } from '@ai-sdk/react';
import type { ModelCatalog } from '@house-elf/shared';
import { DefaultChatTransport } from 'ai';
import { useState } from 'react';

import { useModelSelection } from '../../hooks/model-selection.ts';
import { Composer } from './Composer.tsx';
import { MessageTranscript } from './MessageTranscript.tsx';

export interface ChatViewProps {
	agentId: string;
	modelCatalog: ModelCatalog;
}

export function ChatView({ agentId, modelCatalog }: ChatViewProps) {
	return <ChatSession key={agentId} agentId={agentId} modelCatalog={modelCatalog} />;
}

function ChatSession({ agentId, modelCatalog }: ChatViewProps) {
	// `api` is the only fixed part of the transport: model and thinking travel
	// per message instead (see `send` below), because the choice made at the
	// moment of asking is the one that should apply, not whatever was initial.
	const [transport] = useState(() => new DefaultChatTransport({ api: `/api/chat/${agentId}` }));
	const chat = useChat({ transport });
	const modelSelection = useModelSelection(modelCatalog);

	function retry() {
		void chat.regenerate();
	}

	function send(text: string) {
		// A boolean is all that goes over the wire — what thinking costs the
		// provider is the server's to say.
		void chat.sendMessage(
			{ text },
			{ body: { model: modelSelection.selectedModelId, thinking: modelSelection.thinking } }
		);
	}

	function stop() {
		void chat.stop();
	}

	function selectModel(modelId: string) {
		modelSelection.select(modelId);
	}

	function setThinking(thinking: boolean) {
		modelSelection.setThinking(thinking);
	}

	return (
		<div className="flex h-full min-h-0 flex-col">
			<MessageTranscript
				error={chat.error}
				messages={chat.messages}
				onRetry={retry}
				status={chat.status}
			/>

			<Composer
				canChooseThinking={modelSelection.canChooseThinking}
				models={modelCatalog.models}
				onModelSelect={selectModel}
				onSend={send}
				onStop={stop}
				onThinkingChange={setThinking}
				selectedModelId={modelSelection.selectedModelId}
				status={chat.status}
				thinking={modelSelection.thinking}
			/>
		</div>
	);
}
