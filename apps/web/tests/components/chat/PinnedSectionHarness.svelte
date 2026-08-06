<script lang="ts">
	import { Command } from 'bits-ui';
	import PinnedSection from '$lib/components/chat/PinnedSection.svelte';
	import type { SelectableModel } from '@house-elf/shared';

	let {
		models,
		selectedModelId,
		collapsed,
		ontogglecollapsed,
		ontogglepin,
		ontoggledetails,
		onselect,
		detailsOpenId
	}: {
		models: SelectableModel[];
		selectedModelId: string;
		collapsed: boolean;
		ontogglecollapsed: () => void;
		ontogglepin: (modelId: string) => void;
		ontoggledetails: (modelId: string) => void;
		onselect: (modelId: string) => void;
		detailsOpenId: string | null;
	} = $props();
</script>

<Command.Root label="Models" shouldFilter={false}>
	<Command.List>
		<PinnedSection
			{models}
			{selectedModelId}
			{collapsed}
			{ontogglecollapsed}
			{ontogglepin}
			{ontoggledetails}
			{onselect}
			{detailsOpenId}
		/>
	</Command.List>
</Command.Root>
