<script lang="ts">
	import { renderMarkdown } from '$lib/utils/markdown';

	interface MarkdownProps {
		text: string;
	}

	let { text }: MarkdownProps = $props();

	// Synchronous: the highlighter is loaded when this module is imported, so a
	// streamed message re-renders without a pending state to flicker through.
	const html = $derived(renderMarkdown(text));
</script>

<!-- Safe by construction: `renderMarkdown` escapes all raw HTML and drops
     links whose scheme could execute, and is tested for exactly that. This is
     the one place in the app allowed to inject markup. -->
<!-- eslint-disable-next-line svelte/no-at-html-tags -->
<div class="markdown">{@html html}</div>
