<script lang="ts">
	import type { Snippet } from 'svelte';

	import { createStickToBottom } from '$lib/state/stick-to-bottom.svelte';

	interface StickToBottomProps {
		children: Snippet;
	}

	let { children }: StickToBottomProps = $props();

	const stick = createStickToBottom();
	const { viewport, content } = stick;

	function jumpToLatest() {
		stick.scrollToEnd();
	}
</script>

<div class="relative min-h-0 flex-1">
	<!-- `log` is the role for a running transcript: assistive technology announces
	     additions in order, and waits for a pause rather than interrupting. -->
	<div class="h-full overflow-y-auto" role="log" aria-label="Conversation" use:viewport>
		<div class="mx-auto max-w-3xl px-4 py-6" use:content>
			<!-- `{@render}` is a statement, but the TypeScript bridge sees a call
			     expression returning void. -->
			<!-- eslint-disable-next-line @typescript-eslint/no-confusing-void-expression -->
			{@render children()}
		</div>
	</div>

	{#if !stick.isPinned}
		<!-- Only offered once it is needed. A button that is always there is either
		     ignored or, worse, read as the only way to reach the end. -->
		<button
			type="button"
			class="absolute bottom-4 left-1/2 flex size-8 -translate-x-1/2 items-center justify-center rounded-full border border-line bg-raised text-content shadow-lg transition-colors hover:bg-surface"
			aria-label="Jump to latest"
			onclick={jumpToLatest}
		>
			<svg
				viewBox="0 0 24 24"
				class="size-4"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
				stroke-linecap="round"
				stroke-linejoin="round"
				aria-hidden="true"
			>
				<path d="M12 5v14M19 12l-7 7-7-7" />
			</svg>
		</button>
	{/if}
</div>
