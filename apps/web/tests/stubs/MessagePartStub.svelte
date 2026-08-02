<script lang="ts">
	import { messagePartStub } from './keys';
	import Stub from './Stub.svelte';

	const props: Record<string, unknown> = $props();
</script>

<Stub key={messagePartStub} {...props} />
