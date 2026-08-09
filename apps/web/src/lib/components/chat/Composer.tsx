import type { SelectableModel } from '@house-elf/shared';
import type { ChatStatus } from 'ai';
import type { ChangeEvent } from 'react';
import { useState } from 'react';

import { chatStatus } from '../../constants/chat-status.ts';
import {
	PromptInput,
	PromptInputBody,
	PromptInputFooter,
	PromptInputSubmit,
	PromptInputTextarea,
	PromptInputTools,
	type PromptInputMessage
} from '../vendor/ai-elements/prompt-input.tsx';
import { ModelPicker } from './ModelPicker.tsx';

export interface ComposerProps {
	status: ChatStatus;
	onSend: (text: string) => void;
	onStop: () => void;
	models: readonly SelectableModel[];
	selectedModelId: string;
	onModelSelect: (modelId: string) => void;
	thinking: boolean;
	canChooseThinking: boolean;
	onThinkingChange: (thinking: boolean) => void;
}

export function Composer({
	status,
	onSend,
	onStop,
	models,
	selectedModelId,
	onModelSelect,
	thinking,
	canChooseThinking,
	onThinkingChange
}: ComposerProps) {
	const [draft, setDraft] = useState('');

	// `submitted` covers the gap between sending and the first chunk, when there is
	// nothing on screen yet but the request is already in flight.
	const busy = status === chatStatus.submitted || status === chatStatus.streaming;
	const canSend = draft.trim().length > 0 && !busy;

	function handleSubmit(message: PromptInputMessage) {
		// PromptInputTextarea's own Enter handler falls back to
		// `form.requestSubmit()` whenever it can't find a `button[type="submit"]`
		// to check for `disabled` — which is exactly the case while busy, since
		// PromptInputSubmit swaps to `type="button"` for Stop. This is the one
		// path the vendor's own empty-text disabled-check on the submit button
		// doesn't cover, so it's guarded here instead. Everything else — the IME
		// double-check, the Shift+Enter split, and the empty-text guard on both
		// Enter and click — is the vendored behaviour, unmodified.
		if (!canSend) {
			return;
		}

		onSend(message.text);
		setDraft('');
	}

	function handleChange(event: ChangeEvent<HTMLTextAreaElement>) {
		setDraft(event.target.value);
	}

	return (
		// The border spans the full width of this bar; only the input itself is
		// centered and width-capped, matching the original Svelte layout. Both
		// classes on one element would clip the border to the capped width instead.
		<div className="border-t border-border px-4 py-3">
			<PromptInput className="mx-auto max-w-3xl" onSubmit={handleSubmit}>
				<PromptInputBody>
					<PromptInputTextarea
						aria-label="Message"
						onChange={handleChange}
						placeholder="Send a message…"
						value={draft}
					/>
				</PromptInputBody>

				<PromptInputFooter>
					<PromptInputTools>
						<ModelPicker
							canChooseThinking={canChooseThinking}
							models={models}
							onSelect={onModelSelect}
							onThinkingChange={onThinkingChange}
							selectedModelId={selectedModelId}
							thinking={thinking}
						/>
					</PromptInputTools>

					<PromptInputSubmit disabled={!busy && !canSend} onStop={onStop} status={status} />
				</PromptInputFooter>
			</PromptInput>
		</div>
	);
}
