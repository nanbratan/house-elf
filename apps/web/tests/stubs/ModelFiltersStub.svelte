<script lang="ts">
	import { modelFiltersStub } from './keys';
	import Stub from './Stub.svelte';

	const props: Record<string, unknown> = $props();
</script>

<Stub key={modelFiltersStub} {...props} />
