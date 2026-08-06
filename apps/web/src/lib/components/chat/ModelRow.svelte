<script lang="ts">
	import type { SelectableModel } from '@house-elf/shared';
	import { Command } from 'bits-ui';

	import ModelDetails from '$lib/components/chat/ModelDetails.svelte';

	interface ModelRowProps {
		model: SelectableModel;
		selected: boolean;
		pinned: boolean;
		detailsOpen: boolean;
		ontogglepin: (modelId: string) => void;
		ontoggledetails: (modelId: string) => void;
		onselect: (modelId: string) => void;
	}

	let {
		model,
		selected,
		pinned,
		detailsOpen,
		ontogglepin,
		ontoggledetails,
		onselect
	}: ModelRowProps = $props();
</script>

<Command.Item
	value={model.id}
	onSelect={() => {
		onselect(model.id);
	}}
	aria-label={model.label}
	class="flex cursor-default flex-col gap-1 rounded-lg px-2 py-2 text-sm outline-none data-selected:bg-raised"
>
	<div class="flex items-center gap-2">
		<span class="min-w-0 flex-1 truncate">{model.label}</span>
		{#if selected}
			<svg
				class="size-4 shrink-0 text-accent"
				viewBox="0 0 16 16"
				fill="none"
				stroke="currentColor"
				stroke-width="1.75"
				aria-hidden="true"
			>
				<path d="m3 8 3 3 7-7" />
			</svg>
		{/if}
		<!-- The star is always visible, not revealed on hover — a hover target does
		     not exist for a keyboard user. Like "More" below, it must not select
		     the model when clicked: it is a toggle, not a one-way action, so the
		     click is stopped before it can reach the item's onSelect. -->
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<span
			onclick={(event) => {
				event.stopPropagation();
			}}
			onkeydown={(event) => {
				event.stopPropagation();
			}}
		>
			<button
				type="button"
				onclick={() => {
					ontogglepin(model.id);
				}}
				aria-pressed={pinned}
				aria-label={pinned ? `Unpin ${model.label}` : `Pin ${model.label}`}
				class="flex size-4 shrink-0 items-center justify-center text-muted transition-colors hover:text-content"
			>
				<svg
					class="size-4"
					viewBox="0 0 16 16"
					aria-hidden="true"
					fill={pinned ? 'currentColor' : 'none'}
					stroke="currentColor"
					stroke-width="1.5"
					stroke-linejoin="round"
				>
					<path d="m8 1.5 1.9 4.1 4.6.4-3.5 3 1 4.5L8 11.3 4 13.5l1-4.5-3.5-3 4.6-.4z" />
				</svg>
			</button>
		</span>
		<!-- "More" sits at the far right edge so a thumb finds it in the same place
		     on every row. The label is flex-1, so it absorbs the space the checkmark
		     takes on the selected row — "More" never shifts when the checkmark
		     appears. The checkmark stays just left of "More" (right of the label)
		     rather than moving to the far left: a selection indicator on the right
		     reads as "this one", and keeps the label flush left where a scanning
		     eye starts. -->
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<span
			onclick={(event) => {
				event.stopPropagation();
			}}
			onkeydown={(event) => {
				event.stopPropagation();
			}}
		>
			<button
				type="button"
				onclick={() => {
					ontoggledetails(model.id);
				}}
				aria-expanded={detailsOpen}
				class="shrink-0 text-xs text-muted transition-colors hover:text-content"
			>
				{detailsOpen ? 'Less' : 'More'}
			</button>
		</span>
	</div>
	<!-- Details live inside the Command.Item so they move with it, but the "show
	     more/less" toggle inside them must not select the model. Stopping
	     propagation keeps the click from reaching the item's onSelect, so a
	     reader can read the whole description without committing to the model. -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		onclick={(event) => {
			event.stopPropagation();
		}}
		onkeydown={(event) => {
			event.stopPropagation();
		}}
	>
		<ModelDetails {model} open={detailsOpen} />
	</div>
</Command.Item>
