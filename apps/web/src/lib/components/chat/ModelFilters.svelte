<script lang="ts">
	import type { SelectableModel } from '@house-elf/shared';

	import FilterSelect from '$lib/components/chat/FilterSelect.svelte';
	import {
		availableCapabilities,
		availableModalities,
		availableProviders,
		FREE,
		type ModelFilters
	} from '$lib/utils/model-filters';

	const componentId = $props.id();
	const panelId = `${componentId}-filter-panel`;

	interface ModelFiltersProps {
		/**
		 * The whole catalog, not the narrowed list — the row describes what can be
		 * asked for, so a filter must not vanish the moment it is used.
		 */
		models: readonly SelectableModel[];
		onchange: (filters: ModelFilters) => void;
	}

	let { models, onchange }: ModelFiltersProps = $props();

	let shown = $state(false);
	let chosenProviders = $state<string[]>([]);
	let chosenModalities = $state<string[]>([]);
	let chosenCanDo = $state<string[]>([]);
	let free = $state(false);

	const capabilities = $derived(availableCapabilities(models));
	const canDo = $derived(capabilities.filter((capability) => capability.id !== FREE));
	const freeIsWorthAsking = $derived(capabilities.some((capability) => capability.id === FREE));
	const providers = $derived(availableProviders(models));
	const modalities = $derived(availableModalities(models));
	const filterCount = $derived(
		chosenProviders.length + chosenModalities.length + chosenCanDo.length + (free ? 1 : 0)
	);

	function report() {
		onchange({
			providers: new Set(chosenProviders),
			modalities: new Set(chosenModalities),
			capabilities: new Set(free ? [...chosenCanDo, FREE] : chosenCanDo)
		});
	}
</script>

<button
	type="button"
	aria-label="Filters"
	aria-expanded={shown}
	aria-controls={panelId}
	onclick={() => {
		shown = !shown;
	}}
	class="flex shrink-0 items-center gap-1 rounded-md px-1.5 py-1 text-muted transition-colors hover:bg-raised hover:text-content"
>
	<svg
		class="size-4"
		viewBox="0 0 16 16"
		fill="none"
		stroke="currentColor"
		stroke-width="1.5"
		aria-hidden="true"
	>
		<path d="M2.5 3.5h11l-4.25 5v4l-2.5 1.5v-5.5z" />
	</svg>
	{#if filterCount > 0}
		<span class="rounded-full bg-accent px-1.5 text-[0.625rem] text-white">{filterCount}</span>
	{/if}
</button>

{#if shown}
	<div id={panelId} class="flex w-full flex-wrap items-center gap-1.5 border-t border-line py-2.5">
		<FilterSelect
			label="Provider"
			options={providers.map((provider) => ({
				value: provider.name,
				label: provider.name,
				hint: String(provider.count)
			}))}
			value={chosenProviders}
			onValueChange={(value: string[]) => {
				chosenProviders = value;
				report();
			}}
		/>

		<FilterSelect
			label="Accepts"
			options={modalities.map((modality) => ({ value: modality, label: modality }))}
			value={chosenModalities}
			onValueChange={(value: string[]) => {
				chosenModalities = value;
				report();
			}}
		/>

		{#if canDo.length > 0}
			<FilterSelect
				label="Can do"
				options={canDo.map((capability) => ({ value: capability.id, label: capability.label }))}
				value={chosenCanDo}
				onValueChange={(value: string[]) => {
					chosenCanDo = value;
					report();
				}}
			/>
		{/if}

		{#if freeIsWorthAsking}
			<button
				type="button"
				aria-pressed={free}
				onclick={() => {
					free = !free;
					report();
				}}
				class="rounded-full border border-line px-2.5 py-1 text-xs text-muted transition-colors hover:text-content aria-pressed:border-accent aria-pressed:text-accent"
			>
				Free
			</button>
		{/if}
	</div>
{/if}
