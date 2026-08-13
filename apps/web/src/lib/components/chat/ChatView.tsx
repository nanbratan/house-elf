import type { ModelCatalog } from '@house-elf/shared';
import { AssistantRuntimeProvider } from '@assistant-ui/react';
import { useChatRuntime } from '@assistant-ui/react-ai-sdk';

import { createChatTransport } from '../../chat/transport.ts';
import { useModelSelection } from '../../hooks/model-selection.ts';
import { ChatComposer } from './ChatComposer.tsx';
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

	return (
		<AssistantRuntimeProvider runtime={runtime}>
			<div className="flex h-full min-h-0 flex-col">
				<Thread />

				<ChatComposer models={modelCatalog.models} modelSelection={modelSelection} />
			</div>
		</AssistantRuntimeProvider>
	);
}
