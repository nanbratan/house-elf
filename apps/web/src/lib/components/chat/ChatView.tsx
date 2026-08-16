import type { ModelCatalog } from '@house-elf/shared';
import { AssistantRuntimeProvider } from '@assistant-ui/react';
import { useChatRuntime } from '@assistant-ui/react-ai-sdk';

import { createChatTransport } from '../../chat/transport.ts';
import { seedStorage, type ModelSelectionSeed } from '../../chat/model-selection-seed.ts';
import { useModelSelection } from '../../hooks/model-selection.ts';
import { useModelSettings } from '../../hooks/model-settings.ts';
import { chatSettingsFor } from '../../utils/chat-settings.ts';
import { modelCapabilities } from '../../utils/model-capabilities.ts';
import { resolveSettings } from '../../utils/model-settings.ts';
import type { StoredModelSettings } from '../../utils/stored-model-settings.ts';
import { Composer } from './Composer.tsx';
import { Thread } from './Thread.tsx';

export interface ChatViewProps {
	agentId: string;
	modelCatalog: ModelCatalog;
	/** The persisted model choice, read by the route loader so SSR renders it. */
	modelSelectionSeed: ModelSelectionSeed;
}

/**
 * A conversation: the model choice, the settings that shape its answers, the
 * transport that carries both, and the runtime they feed.
 *
 * The thread and the composer are separate components because a component
 * cannot consume a context it provides, and both read this runtime. The composer
 * is built here — its model choice is the same state the transport reads — and
 * handed to `Thread` as an element, because it has to render inside the viewport.
 */
export function ChatView({ agentId, modelCatalog, modelSelectionSeed }: ChatViewProps) {
	const modelSelection = useModelSelection(modelCatalog, seedStorage(modelSelectionSeed));
	const modelSettings = useModelSettings(modelCatalog.models, modelSelection.selectedModelId);

	const transport = createChatTransport({
		agentId,
		settings: chatSettingsFor(
			modelSelection.selectedModel.id,
			resolveSettings(modelCapabilities(modelSelection.selectedModel), modelSettings.stored)
		)
	});

	const runtime = useChatRuntime({ transport });

	function selectModel(modelId: string) {
		modelSelection.select(modelId);
	}

	function changeSetting<Field extends keyof StoredModelSettings>(
		field: Field,
		value: StoredModelSettings[Field]
	) {
		modelSettings.set(field, value);
	}

	return (
		<AssistantRuntimeProvider runtime={runtime}>
			<Thread
				composer={
					<Composer
						models={modelCatalog.models}
						onModelSelect={selectModel}
						onSettingChange={changeSetting}
						selectedModel={modelSelection.selectedModel}
						settingsRestored={modelSettings.restored}
						storedSettings={modelSettings.stored}
					/>
				}
			/>
		</AssistantRuntimeProvider>
	);
}
