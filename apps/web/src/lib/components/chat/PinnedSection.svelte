<script lang="ts">
	import type { SelectableModel } from '@house-elf/shared';

	import ModelRow from '$lib/components/chat/ModelRow.svelte';

	interface PinnedSectionProps {
		/** The pinned models, resolved from the catalog and sorted. */
		models: readonly SelectableModel[];
		/** The currently selected model id. Passed through to each row so the
		 * selected pin shows its checkmark, same as a row in the main list. */
		selectedModelId: string;
		/** Whether the section is folded away. */
		collapsed: boolean;
		/** Folds or unfolds the section. */
		ontogglecollapsed: () => void;
		/** Pin or unpin a model from a row's star. */
		ontogglepin: (modelId: string) => void;
		/** Toggle the details panel for a row. */
		ontoggledetails: (modelId: string) => void;
		/** Select a model — the whole row is a click target. */
		onselect: (modelId: string) => void;
		/** The id of the row whose details are open, or null. An accordion: one
		 * panel open at a time, shared with the main list. */
		detailsOpenId: string | null;
	}

	let {
		models,
		selectedModelId,
		collapsed,
		ontogglecollapsed,
		ontogglepin,
		ontoggledetails,
		onselect,
		detailsOpenId
	}: PinnedSectionProps = $props();
</script>

<div data-testid="pinned-section" data-command-group="">
	<!-- The heading is a button so it can fold the section, and carries the count
	     so a reader knows how many pins are inside before opening it. -->
	<div
		data-command-group-heading=""
		class="px-2 pt-3 pb-1 text-xs font-medium tracking-wide text-faint"
	>
		<button
			type="button"
			onclick={() => {
				ontogglecollapsed();
			}}
			aria-expanded={!collapsed}
			class="flex w-full items-center gap-1"
		>
			<svg
				class="size-3 shrink-0 transition-transform {collapsed ? '-rotate-90' : ''}"
				viewBox="0 0 12 12"
				fill="none"
				stroke="currentColor"
				stroke-width="1.5"
				aria-hidden="true"
			>
				<path d="m3 4.5 3 3 3-3" />
			</svg>
			Pinned ({models.length})
		</button>
	</div>
	{#if !collapsed}
		<div data-command-group-items="">
			{#each models as model (model.id)}
				<ModelRow
					{model}
					selected={model.id === selectedModelId}
					pinned={true}
					detailsOpen={detailsOpenId === model.id}
					{ontogglepin}
					{ontoggledetails}
					{onselect}
				/>
			{/each}
		</div>
	{/if}
</div>
