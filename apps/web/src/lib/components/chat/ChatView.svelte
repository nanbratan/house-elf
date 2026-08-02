<script lang="ts">
	import type { ModelCatalog } from '@house-elf/shared';
	import { Chat } from '@ai-sdk/svelte';
	import { DefaultChatTransport } from 'ai';
	import { untrack } from 'svelte';

	import { createModelSelection } from '$lib/state/model-selection.svelte';
	import Composer from './Composer.svelte';
	import ErrorNotice from './ErrorNotice.svelte';
	import StickToBottom from './StickToBottom.svelte';
	import MessagePart from './MessagePart.svelte';

	interface ChatViewProps {
		agentId: string;
		modelCatalog: ModelCatalog;
	}

	let { agentId, modelCatalog }: ChatViewProps = $props();

	const modelSelection = untrack(() => createModelSelection(modelCatalog));

	// The URL is relative, so the browser sends it to whatever origin served the
	// page. Only the SvelteKit server knows where Mastra actually lives.
	//
	// `api` is a fixed string rather than something the transport re-reads, so a
	// change of agent has to build a new Chat. That also discards the transcript,
	// which is the right behaviour: a different agent is a different conversation.
	const chat: Chat = $derived(
		new Chat({
			transport: new DefaultChatTransport({ api: `/api/chat/${agentId}` })
		})
	);

	const empty = $derived(chat.messages.length === 0);

	function retry() {
		void chat.regenerate();
	}

	function selectModel(modelId: string) {
		modelSelection.select(modelId);
	}

	function send(text: string) {
		void chat.sendMessage({ text }, { body: { model: modelSelection.selectedModelId } });
	}

	function stop() {
		void chat.stop();
	}
</script>

<div class="flex h-full min-h-0 flex-col">
	<StickToBottom>
		{#if empty}
			<p class="py-16 text-center text-sm text-faint">Ask anything.</p>
		{/if}

		{#each chat.messages as message (message.id)}
			<article class="mb-6" data-role={message.role}>
				<div class="mb-1 text-xs font-medium text-faint">
					{message.role === 'user' ? 'You' : 'house-elf'}
				</div>

				<div
					class="rounded-lg px-3 py-2 text-sm leading-relaxed"
					class:bg-raised={message.role === 'user'}
				>
					{#each message.parts as part, index (index)}
						<MessagePart {part} />
					{/each}
				</div>
			</article>
		{/each}

		{#if chat.error}
			<ErrorNotice error={chat.error} onretry={retry} />
		{/if}
	</StickToBottom>

	<Composer
		status={chat.status}
		models={modelCatalog.models}
		selectedModelId={modelSelection.selectedModelId}
		onmodelselect={selectModel}
		onsend={send}
		onstop={stop}
	/>
</div>
