<script lang="ts">
	import type { DynamicToolUIPart, ToolUIPart } from 'ai';

	import { type ToolState, toolState } from '$lib/constants/tool-state';
	import { createExpansion } from '$lib/state/expansion.svelte';
	import { highlightCode } from '$lib/utils/markdown';

	import WorkingDots from './WorkingDots.svelte';

	// `isToolUIPart` narrows to either shape, and they share every field this card
	// reads, so both are accepted rather than handled twice.
	interface ToolCardProps {
		name: string;
		part: ToolUIPart | DynamicToolUIPart;
	}

	let { name, part }: ToolCardProps = $props();

	/**
	 * Listed exhaustively rather than with a fallback, so a state the SDK adds is a
	 * type error here instead of a card that quietly mislabels what happened.
	 */
	const labels: Record<ToolState, string> = {
		[toolState.preparing]: 'Preparing…',
		[toolState.running]: 'Running…',
		[toolState.approvalRequested]: 'Waiting for approval',
		[toolState.approvalResponded]: 'Approval sent',
		[toolState.done]: 'Done',
		[toolState.denied]: 'Denied',
		[toolState.failed]: 'Failed'
	};

	const busy = $derived(part.state === toolState.preparing || part.state === toolState.running);
	const bad = $derived(part.state === toolState.failed || part.state === toolState.denied);
	const waiting = $derived(part.state === toolState.approvalRequested);

	// Left to itself the card follows the tool: open while it runs or while
	// something needs reading, closed once it is just a receipt.
	const expansion = createExpansion(() => busy || bad || waiting);

	// The dot the other five states get, where a running tool gets `WorkingDots`.
	// It says at a glance what the label spells out, and keeps the header the same
	// height whether the tool is working or done.
	const statusColour = $derived.by(() => {
		if (bad) return 'bg-red-400';
		if (waiting) return 'bg-amber-400';

		return 'bg-faint';
	});

	/**
	 * Values are code: objects as JSON, strings as themselves. A call whose
	 * arguments have not started arriving has no input at all, and Shiki throws on
	 * a missing string — taking down the whole message rather than the card — so
	 * that case is absorbed here.
	 */
	function code(value: unknown = ''): { text: string; lang: string } {
		if (typeof value === 'string') return { text: value, lang: 'text' };

		return { text: JSON.stringify(value, null, 2), lang: 'json' };
	}

	function toggle() {
		expansion.toggle();
	}
</script>

{#snippet section(title: string, value: unknown)}
	{@const highlighted = code(value)}
	<!-- Labelled so the two blocks are distinguishable to a screen reader, and to
	     a test, without either having to guess from position. -->
	<section aria-label={title}>
		<div class="mb-1 text-faint" aria-hidden="true">{title}</div>
		<div class="overflow-x-auto rounded [&_pre]:bg-transparent! [&_pre]:p-2">
			<!-- Shiki escapes everything it wraps, so the only markup here is its own.
			     See highlightCode in src/lib/utils/markdown.ts. -->
			<!-- eslint-disable-next-line svelte/no-at-html-tags -->
			{@html highlightCode(highlighted.text, highlighted.lang)}
		</div>
	</section>
{/snippet}

<div class="my-2 overflow-hidden rounded-lg border border-line text-xs">
	<!-- Fixed height, so a tool finishing changes only the body. A header that
	     moved as the status text changed would be hard to read at a glance. -->
	<button
		type="button"
		class="flex h-9 w-full items-center gap-2 px-3 text-left transition-colors hover:bg-raised"
		aria-expanded={expansion.isOpen}
		onclick={toggle}
	>
		{#if busy}
			<WorkingDots />
		{:else}
			<span class="size-1.5 shrink-0 rounded-full {statusColour}" aria-hidden="true"></span>
		{/if}

		<span class="font-medium">{name}</span>
		<span class="text-faint">{labels[part.state]}</span>
	</button>

	{#if expansion.isOpen}
		<div class="space-y-2 border-t border-line px-3 py-2">
			<!-- Arguments stream in as fragments, so this is deliberately whatever has
			     arrived so far rather than waiting for the whole call. -->
			<!-- `{@render}` is a statement, but the TypeScript bridge sees a call
			     expression returning void. The rule is wrong here, twice. -->
			<!-- eslint-disable @typescript-eslint/no-confusing-void-expression -->
			{@render section('Input', part.input)}

			{#if part.state === toolState.done}
				{@render section('Result', part.output)}
				<!-- eslint-enable @typescript-eslint/no-confusing-void-expression -->
			{:else if part.state === toolState.failed}
				<div>
					<div class="mb-1 text-faint">Error</div>
					<pre class="overflow-x-auto whitespace-pre-wrap text-red-400">{part.errorText}</pre>
				</div>
			{:else if part.state === toolState.denied}
				<p class="text-muted">This call was refused, so the tool never ran.</p>
			{/if}
		</div>
	{/if}
</div>
