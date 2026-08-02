<script lang="ts">
	import { modelPickerStub } from './keys';
	import Stub from './Stub.svelte';

	const props: Record<string, unknown> = $props();
</script>

<Stub key={modelPickerStub} {...props} />
