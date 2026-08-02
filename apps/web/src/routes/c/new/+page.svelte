<script lang="ts">
	import ChatView from '$lib/components/chat/ChatView.svelte';

	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<!-- One agent for now. M3 adds the picker; the route already carries the id. -->
<ChatView agentId="general" modelCatalog={data.modelCatalog} />
