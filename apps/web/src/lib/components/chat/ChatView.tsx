import type { ModelCatalog } from '@house-elf/shared';
import { AssistantRuntimeProvider } from '@assistant-ui/react';
import { useChatRuntime } from '@assistant-ui/react-ai-sdk';

import { createChatTransport } from '../../chat/transport.ts';
import { seedStorage, type ModelSelectionSeed } from '../../chat/model-selection-seed.ts';
import { useModelSelection } from '../../hooks/model-selection.ts';
import { Composer } from './Composer.tsx';
import { Thread } from './Thread.tsx';

export interface ChatViewProps {
	agentId: string;
	modelCatalog: ModelCatalog;
	/** The persisted model choice, read by the route loader so SSR renders it. */
	modelSelectionSeed: ModelSelectionSeed;
}

/**
 * A conversation: the model choice, the transport that carries it, and the
 * runtime both feed.
 *
 * The thread and the composer are separate components because a component
 * cannot consume a context it provides, and both read this runtime. The composer
 * is built here — its model choice is the same state the transport reads — and
 * handed to `Thread` as an element, because it has to render inside the viewport.
 */
export function ChatView({ agentId, modelCatalog, modelSelectionSeed }: ChatViewProps) {
	const modelSelection = useModelSelection(modelCatalog, seedStorage(modelSelectionSeed));

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
			<Thread
				composer={
					<Composer
						canChooseThinking={modelSelection.canChooseThinking}
						models={modelCatalog.models}
						onModelSelect={selectModel}
						onThinkingChange={setThinking}
						selectedModelId={modelSelection.selectedModelId}
						thinking={modelSelection.thinking}
					/>
				}
			/>
		</AssistantRuntimeProvider>
	);
}
