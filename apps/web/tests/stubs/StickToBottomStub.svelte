<script lang="ts">
	import { stickToBottomStub } from './keys';
	import Stub from './Stub.svelte';

	const props: Record<string, unknown> = $props();
</script>

<Stub key={stickToBottomStub} {...props} />
