<script lang="ts">
	import type { ChatStatus } from 'ai';

	let {
		status,
		onsend,
		onstop
	}: {
		status: ChatStatus;
		onsend: (text: string) => void;
		onstop: () => void;
	} = $props();

	let text = $state('');

	// `submitted` covers the gap between sending and the first chunk, when there is
	// nothing on screen yet but the request is already in flight.
	const busy = $derived(status === 'submitted' || status === 'streaming');
	const canSend = $derived(text.trim().length > 0 && !busy);

	function send() {
		if (!canSend) return;
		onsend(text);
		text = '';
	}

	function onkeydown(event: KeyboardEvent) {
		// Shift+Enter inserts a newline, so it must fall through to the textarea.
		// IME composition also sends Enter; intercepting it would cut off anyone
		// typing in a language that needs a candidate window.
		if (event.key !== 'Enter' || event.shiftKey || event.isComposing) return;

		event.preventDefault();
		send();
	}
</script>

<form
	class="border-t border-line bg-canvas px-4 py-3"
	onsubmit={(event) => {
		event.preventDefault();
		send();
	}}
>
	<div class="mx-auto flex max-w-3xl items-end gap-2">
		<textarea
			bind:value={text}
			{onkeydown}
			rows="1"
			placeholder="Send a message…"
			aria-label="Message"
			class="max-h-48 min-h-11 flex-1 resize-none rounded-lg border border-line bg-raised px-3 py-2.5 text-sm placeholder:text-faint"
		></textarea>

		{#if busy}
			<button
				type="button"
				onclick={onstop}
				class="h-11 shrink-0 rounded-lg border border-line px-4 text-sm text-muted transition-colors hover:bg-raised hover:text-content"
			>
				Stop
			</button>
		{:else}
			<button
				type="submit"
				disabled={!canSend}
				class="h-11 shrink-0 rounded-lg bg-accent px-4 text-sm font-medium text-canvas transition-opacity disabled:opacity-40"
			>
				Send
			</button>
		{/if}
	</div>
</form>
