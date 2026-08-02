<script lang="ts">
	import { reasoningStub } from './keys';
	import Stub from './Stub.svelte';

	const props: Record<string, unknown> = $props();
</script>

<Stub key={reasoningStub} {...props} />
