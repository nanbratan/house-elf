<script lang="ts">
	import { toolCardStub } from './keys';
	import Stub from './Stub.svelte';

	const props: Record<string, unknown> = $props();
</script>

<Stub key={toolCardStub} {...props} />
