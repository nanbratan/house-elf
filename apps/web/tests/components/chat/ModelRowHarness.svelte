<script lang="ts">
	import { Command } from 'bits-ui';
	import ModelRow from '$lib/components/chat/ModelRow.svelte';
	import type { SelectableModel } from '@house-elf/shared';

	let {
		model,
		selected,
		pinned,
		detailsOpen,
		ontogglepin,
		ontoggledetails,
		onselect
	}: {
		model: SelectableModel;
		selected: boolean;
		pinned: boolean;
		detailsOpen: boolean;
		ontogglepin: (modelId: string) => void;
		ontoggledetails: (modelId: string) => void;
		onselect: (modelId: string) => void;
	} = $props();
</script>

<Command.Root label="Models" shouldFilter={false}>
	<Command.List>
		<ModelRow
			{model}
			{selected}
			{pinned}
			{detailsOpen}
			{ontogglepin}
			{ontoggledetails}
			{onselect}
		/>
	</Command.List>
</Command.Root>
