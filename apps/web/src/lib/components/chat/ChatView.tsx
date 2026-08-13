import type { ModelCatalog } from '@house-elf/shared';
import { AssistantRuntimeProvider } from '@assistant-ui/react';
import { useChatRuntime } from '@assistant-ui/react-ai-sdk';

import { createChatTransport } from '../../chat/transport.ts';
import { useModelSelection } from '../../hooks/model-selection.ts';
import { Composer } from './Composer.tsx';
import { Thread } from './Thread.tsx';

export interface ChatViewProps {
	agentId: string;
	modelCatalog: ModelCatalog;
}

/**
 * A conversation: the model choice, the transport that carries it, and the
 * runtime both feed.
 *
 * The thread and the composer are separate components because a component
 * cannot consume a context it provides, and both read this runtime.
 */
export function ChatView({ agentId, modelCatalog }: ChatViewProps) {
	const modelSelection = useModelSelection(modelCatalog);

	const transport = createChatTransport({
		agentId,
		settings: { model: modelSelection.selectedModelId, thinking: modelSelection.thinking }
	});

	const runtime = useChatRuntime({ transport });

	function selectModel(modelId: string) {
		modelSelection.select(modelId);
	}

	function setThinking(thinking: boolean) {
		modelSelection.setThinking(thinking);
	}

	return (
		<AssistantRuntimeProvider runtime={runtime}>
			<div className="flex h-full min-h-0 flex-col">
				<Thread />

				<Composer
					canChooseThinking={modelSelection.canChooseThinking}
					models={modelCatalog.models}
					onModelSelect={selectModel}
					onThinkingChange={setThinking}
					selectedModelId={modelSelection.selectedModelId}
					thinking={modelSelection.thinking}
				/>
			</div>
		</AssistantRuntimeProvider>
	);
}
