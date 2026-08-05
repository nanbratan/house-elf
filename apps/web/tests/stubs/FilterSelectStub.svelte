<script lang="ts">
	import { filterSelectStub } from './keys';
	import Stub from './Stub.svelte';

	const props: Record<string, unknown> = $props();
</script>

<Stub key={filterSelectStub} {...props} />
