<script lang="ts">
	import { pinnedSectionStub } from './keys';
	import Stub from './Stub.svelte';

	const props: Record<string, unknown> = $props();
</script>

<Stub key={pinnedSectionStub} {...props} />
