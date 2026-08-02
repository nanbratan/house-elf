<script lang="ts">
	import { createExpansion } from '$lib/state/expansion.svelte';

	interface ReasoningPartProps {
		text: string;
		streaming: boolean;
	}

	let { text, streaming }: ReasoningPartProps = $props();

	/** How long the pane stays open after the model stops thinking. */
	const LINGER_MS = 1000;

	/**
	 * A thought that streams in front of us passes through these in order. Anything
	 * that arrived already finished — a reloaded thread — stays `absent`: there is
	 * no duration to report and nothing to close.
	 */
	const phase = {
		absent: 'absent',
		thinking: 'thinking',
		lingering: 'lingering',
		read: 'read'
	} as const;

	type Phase = (typeof phase)[keyof typeof phase];

	let thought = $state<Phase>(phase.absent);
	let thoughtSeconds = $state<number | undefined>();

	// When the thought began. Not `$state` because nothing renders it, and because
	// an effect that reads reactive state re-runs when that state changes — which
	// would cancel the linger timer below through its own cleanup.
	let startedAtMs: number | undefined;

	// Reads `streaming` and nothing else, so it runs exactly twice per thought:
	// once when the model starts, once when it stops.
	$effect(() => {
		if (streaming) {
			startedAtMs = Date.now();
			thought = phase.thinking;
			return;
		}

		if (startedAtMs === undefined) return;

		thoughtSeconds = Math.round((Date.now() - startedAtMs) / 1000);
		thought = phase.lingering;

		// A beat before collapsing, so the last words stay readable instead of
		// vanishing the instant the model stops.
		const timer = setTimeout(() => (thought = phase.read), LINGER_MS);

		return () => {
			clearTimeout(timer);
		};
	});

	// Left to itself the pane follows the model: open while it thinks, closed a
	// beat after it stops.
	const expansion = createExpansion(
		() => thought === phase.thinking || thought === phase.lingering
	);

	const label = $derived.by(() => {
		if (streaming) return 'Thinking…';
		if (thoughtSeconds === undefined) return 'Thought about it';
		if (thoughtSeconds === 0) return 'Thought for a moment';

		return `Thought for ${String(thoughtSeconds)} second${thoughtSeconds === 1 ? '' : 's'}`;
	});

	function toggle() {
		expansion.toggle();
	}
</script>

<div class="my-2 text-xs text-faint">
	<button
		type="button"
		class="rounded px-1 py-0.5 transition-colors hover:text-muted"
		class:animate-pulse={streaming}
		aria-expanded={expansion.isOpen}
		onclick={toggle}
	>
		{label}
	</button>

	{#if expansion.isOpen}
		<div class="mt-1 border-l border-line pl-3 whitespace-pre-wrap italic">{text}</div>
	{/if}
</div>
