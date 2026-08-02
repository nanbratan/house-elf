<script lang="ts">
	import { composerStub } from './keys';
	import Stub from './Stub.svelte';

	const props: Record<string, unknown> = $props();
</script>

<Stub key={composerStub} {...props} />
