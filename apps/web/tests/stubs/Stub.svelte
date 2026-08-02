<script lang="ts">
	import type { Snippet } from 'svelte';

	import { recordStubProps, type StubKey } from './stub-props';

	// The one stub. Every file next to this is a wrapper that declares its own key —
	// see tests/stubs/stub-props.ts for why a stub renders nothing of its own.
	const { key, ...props }: { key: StubKey } & Record<string, unknown> = $props();
	const instanceId = $props.id();

	// Only `StickToBottom` hands its stub a snippet, and that one has to render or
	// the transcript under test disappears with it.
	const children = $derived(props.children as Snippet | undefined);

	$effect(() => {
		recordStubProps(key, instanceId, { ...props });
	});
</script>

<div data-testid={key.description} data-stub-id={instanceId}>
	{#if children}{@render children()}{/if}
</div>
