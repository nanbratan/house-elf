<script lang="ts">
	import type { SelectableModel } from '@house-elf/shared';
	import type { ChatStatus } from 'ai';

	import ModelPicker from './ModelPicker.svelte';

	interface ComposerProps {
		status: ChatStatus;
		onsend: (text: string) => void;
		onstop: () => void;
		models: readonly SelectableModel[];
		selectedModelId: string;
		onmodelselect: (modelId: string) => void;
		thinking: boolean;
		canChooseThinking: boolean;
		onthinkingchange: (thinking: boolean) => void;
	}

	let {
		status,
		onsend,
		onstop,
		models,
		selectedModelId,
		onmodelselect,
		thinking,
		canChooseThinking,
		onthinkingchange
	}: ComposerProps = $props();

	let text = $state('');
	let textareaElement: HTMLTextAreaElement | undefined;

	// `submitted` covers the gap between sending and the first chunk, when there is
	// nothing on screen yet but the request is already in flight.
	const busy = $derived(status === 'submitted' || status === 'streaming');
	const canSend = $derived(text.trim().length > 0 && !busy);

	// Tracked as well as read from the event, because `KeyboardEvent.isComposing`
	// is not reliable across browsers — some report `false` for the Enter that
	// accepts an IME candidate. Getting this wrong sends half-composed Japanese or
	// Chinese, so both signals are checked and either one is enough to bail out.
	let composing = $state(false);

	function send() {
		if (!canSend) return;
		onsend(text);
		text = '';
	}

	function onkeydown(event: KeyboardEvent) {
		// Shift+Enter inserts a newline, so it must fall through to the textarea.
		if (event.key !== 'Enter' || event.shiftKey || event.isComposing || composing) return;

		event.preventDefault();
		send();
	}

	function onsubmit(event: SubmitEvent) {
		event.preventDefault();
		send();
	}

	function oncompositionstart() {
		composing = true;
	}

	function oncompositionend() {
		composing = false;
	}

	// Clicking the footer's empty space should feel like clicking into the input it
	// sits inside of. Only fires when the click's target is the footer row itself —
	// a real control inside it (the picker, its own click handler; the send/stop
	// button, theirs) stops the event from ever reaching this handler, so nothing
	// here has to guess what was clicked.
	function onfooterclick(event: MouseEvent) {
		if (event.currentTarget !== event.target) return;
		textareaElement?.focus();
	}
</script>

<form class="border-t border-line bg-canvas px-4 py-3" {onsubmit}>
	<div
		class="mx-auto max-w-3xl overflow-hidden rounded-xl border border-line bg-raised transition-colors focus-within:border-accent/50"
	>
		<textarea
			bind:this={textareaElement}
			bind:value={text}
			{onkeydown}
			{oncompositionstart}
			{oncompositionend}
			rows="1"
			placeholder="Send a message…"
			aria-label="Message"
			class="max-h-48 min-h-12 w-full resize-none bg-transparent px-3 pt-3 pb-2 text-sm outline-none placeholder:text-faint"
		></textarea>

		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div class="flex items-center justify-end gap-1.5 px-2 pb-2" onclick={onfooterclick}>
			<ModelPicker
				{models}
				{selectedModelId}
				onselect={onmodelselect}
				{thinking}
				{canChooseThinking}
				{onthinkingchange}
			/>

			{#if busy}
				<button
					type="button"
					onclick={onstop}
					class="flex h-8 shrink-0 items-center gap-2 rounded-md border border-line px-3 text-xs text-muted transition-colors hover:bg-canvas hover:text-content"
				>
					<!-- The only sign anything is happening between pressing Enter and the
					     first token arriving: pulsing while the request is in flight, steady
					     once the reply is actually coming. The label stays "Stop" in both
					     states, because that is what the button does. -->
					<span
						class="size-1.5 rounded-full bg-accent"
						class:animate-pulse={status === 'submitted'}
						aria-hidden="true"
					></span>
					Stop
				</button>
			{:else}
				<button
					type="submit"
					disabled={!canSend}
					class="h-8 shrink-0 rounded-md bg-accent px-3 text-xs font-medium text-canvas transition-opacity disabled:opacity-40"
				>
					Send
				</button>
			{/if}
		</div>
	</div>
</form>
