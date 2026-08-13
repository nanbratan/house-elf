import type { ModelCatalog } from '@house-elf/shared';
import { useAISDKChat } from '@assistant-ui/react-ai-sdk';

import { chatStatus } from '../../constants/chat-status.ts';
import type { ModelSelection } from '../../hooks/model-selection.ts';
import { Composer } from './Composer.tsx';

export interface ChatComposerProps {
	models: ModelCatalog['models'];
	modelSelection: ModelSelection;
}

/**
 * The draft and the controls that shape it, wired to the runtime `ChatView`
 * provides.
 *
 * Nothing is attached to the message here: what a request carries is settled by
 * the transport at send time, so a regenerate sends the same settings as a
 * first ask.
 *
 * Transitional: `Composer` keeps the props it already had. It goes when
 * assistant-ui's own `<Thread />` lands.
 */
export function ChatComposer({ models, modelSelection }: ChatComposerProps) {
	const chat = useAISDKChat();

	function send(text: string) {
		void chat?.sendMessage({ text });
	}

	function stop() {
		void chat?.stop();
	}

	function selectModel(modelId: string) {
		modelSelection.select(modelId);
	}

	function setThinking(thinking: boolean) {
		modelSelection.setThinking(thinking);
	}

	return (
		<Composer
			canChooseThinking={modelSelection.canChooseThinking}
			models={models}
			onModelSelect={selectModel}
			onSend={send}
			onStop={stop}
			onThinkingChange={setThinking}
			selectedModelId={modelSelection.selectedModelId}
			status={chat?.status ?? chatStatus.ready}
			thinking={modelSelection.thinking}
		/>
	);
}
