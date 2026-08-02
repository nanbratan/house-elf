<script lang="ts">
	import { markdownStub } from './keys';
	import Stub from './Stub.svelte';

	const props: Record<string, unknown> = $props();
</script>

<Stub key={markdownStub} {...props} />
