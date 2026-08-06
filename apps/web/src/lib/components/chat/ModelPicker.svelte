<script lang="ts">
	import type { SelectableModel } from '@house-elf/shared';
	import { Command, Dialog } from 'bits-ui';

	import ModelFilters from '$lib/components/chat/ModelFilters.svelte';
	import ModelRow from '$lib/components/chat/ModelRow.svelte';
	import PinnedSection from '$lib/components/chat/PinnedSection.svelte';
	import { createPinnedModels } from '$lib/state/pinned-models.svelte';
	import { filterModels, type ModelFilters as Filters, noFilters } from '$lib/utils/model-filters';
	import { pinnedModels, releaseSections, searchSections } from '$lib/utils/model-list';
	import { untrack } from 'svelte';

	const componentId = $props.id();
	const modelListId = `${componentId}-model-list`;
	const thinkingLabelId = `${componentId}-thinking-label`;

	interface ModelPickerProps {
		models: readonly SelectableModel[];
		selectedModelId: string;
		onselect: (modelId: string) => void;
		thinking: boolean;
		/**
		 * False when the current model settles the question itself — it either
		 * always thinks or cannot. The row is then not rendered at all, rather than
		 * shown disabled: a control that can never be used is just clutter.
		 */
		canChooseThinking: boolean;
		onthinkingchange: (thinking: boolean) => void;
	}

	let {
		models,
		selectedModelId,
		onselect,
		thinking,
		canChooseThinking,
		onthinkingchange
	}: ModelPickerProps = $props();

	// Pinned models are the picker's own concern — nothing above it needs to know
	// which models are pinned, so the state lives here. `untrack` because the
	// catalog is fetched once and does not change during the picker's lifetime.
	const pins = untrack(() => createPinnedModels(models));

	let open = $state(false);
	let search = $state('');
	let filters = $state<Filters>(noFilters);
	// One details panel open at a time — an accordion, not a row of toggles, so
	// the list does not grow a second scroll inside itself.
	let detailsOpenId = $state<string | null>(null);
	const selectedModel = $derived(models.find((model) => model.id === selectedModelId));

	const listed = $derived(filterModels(models, filters));

	// The pinned section shows the reader's pins regardless of active filters — a
	// pin is not a filter — and renders only when there is at least one pin. It is
	// hidden while a search is active so results stay a flat ranked list rather
	// than a section above one.
	const pinned = $derived(pinnedModels(models, pins.pinnedIds));
	const showPinned = $derived(pinned.length > 0 && search.trim() === '');

	// A pinned model lives in the pinned section, not in the main list — two
	// rows for the same model share one hover state under bits-ui's Command,
	// which reads as the main list reacting to the pinned section. The main list
	// drops pinned ids, but the search source keeps them: a pin is still a model
	// the reader can look up by name, and search results are a flat list with no
	// pinned section above them.
	const pinnedIdSet = $derived(new Set(pinned.map((model) => model.id)));
	const browseList = $derived(listed.filter((model) => !pinnedIdSet.has(model.id)));

	// Grouping depends on the catalog and the filters, so a keystroke in the
	// search box re-runs the search and nothing else.
	const grouped = $derived(releaseSections(browseList));
	const sections = $derived(search.trim() === '' ? grouped : searchSections(listed, search));
	const listedCount = $derived(
		sections.reduce((count, { models: found }) => count + found.length, 0)
	);
	const countLabel = $derived(listedCount === 1 ? '1 model' : `${String(listedCount)} models`);

	function select(modelId: string) {
		search = '';
		onselect(modelId);
		// Verified against bits-ui 2.x: `Command.Item` keeps reading its own derived
		// state after `onSelect` returns, so closing the dialog synchronously destroys
		// that tree mid-event and Svelte reports `derived_inert`. Deferring one task
		// lets the item finish before the command unmounts.
		setTimeout(() => {
			open = false;
		}, 0);
	}

	function togglePin(modelId: string) {
		pins.toggle(modelId);
	}

	function toggleDetails(modelId: string) {
		detailsOpenId = detailsOpenId === modelId ? null : modelId;
	}
</script>

<Dialog.Root bind:open>
	<Dialog.Trigger
		aria-label={`Choose model. Current model: ${selectedModel?.label ?? 'none'}${
			thinking ? ', thinking on' : ''
		}`}
		class="flex h-8 min-w-0 items-center gap-1.5 rounded-md px-2 text-xs text-muted transition-colors hover:bg-canvas hover:text-content"
	>
		<span class="max-w-32 truncate">{selectedModel?.label ?? 'Choose model'}</span>
		{#if thinking}
			<!-- Named on the trigger so an expensive setting is never a hidden one. -->
			<span class="shrink-0 text-faint">Thinking</span>
		{/if}
		<svg
			class="size-3 shrink-0"
			viewBox="0 0 12 12"
			fill="none"
			stroke="currentColor"
			stroke-width="1.5"
			aria-hidden="true"
		>
			<path d="m3 4.5 3 3 3-3" />
		</svg>
	</Dialog.Trigger>

	<Dialog.Portal>
		<Dialog.Overlay class="fixed inset-0 z-50 bg-black/50 backdrop-blur-[1px]" />
		<Dialog.Content
			class="fixed top-1/2 left-1/2 z-50 w-[min(26rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-xl border border-line bg-surface shadow-2xl outline-none"
		>
			<Dialog.Title class="sr-only">Choose a model</Dialog.Title>

			<Command.Root
				label="Models"
				value={selectedModelId}
				shouldFilter={false}
				loop
				class="flex h-[min(30rem,80vh)] flex-col"
			>
				<div class="flex flex-wrap items-center gap-2 border-b border-line px-3">
					<svg
						class="size-4 shrink-0 text-faint"
						viewBox="0 0 16 16"
						fill="none"
						stroke="currentColor"
						stroke-width="1.5"
						aria-hidden="true"
					>
						<circle cx="7" cy="7" r="4.5" />
						<path d="m10.5 10.5 3 3" />
					</svg>
					<input
						type="search"
						bind:value={search}
						role="combobox"
						aria-label="Search models"
						aria-controls={modelListId}
						aria-expanded="true"
						aria-haspopup="listbox"
						autocomplete="off"
						placeholder="Search models…"
						class="h-11 min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-faint"
					/>
					<!-- Live, because it is how a search or a filter announces that it did
					     something before the reader scrolls to find out. -->
					<span aria-live="polite" class="shrink-0 text-xs text-faint">{countLabel}</span>
					<!-- Wraps onto its own line when opened, which is why the row wraps. -->
					<ModelFilters
						{models}
						onchange={(chosen: Filters) => {
							filters = chosen;
						}}
					/>
				</div>

				<Command.List id={modelListId} class="overflow-y-auto p-1.5">
					{#if sections.length === 0 && !showPinned}
						<div class="px-3 py-8 text-center text-sm text-faint">No models found.</div>
					{/if}

					{#if showPinned}
						<PinnedSection
							models={pinned}
							{selectedModelId}
							collapsed={pins.collapsed}
							ontogglecollapsed={() => {
								pins.toggleCollapsed();
							}}
							ontogglepin={togglePin}
							ontoggledetails={toggleDetails}
							onselect={select}
							{detailsOpenId}
						/>
					{/if}

					{#each sections as section (section.id)}
						<Command.Group>
							<Command.GroupHeading
								class="px-2 pt-3 pb-1 text-xs font-medium tracking-wide text-faint"
							>
								{section.title}
							</Command.GroupHeading>
							<Command.GroupItems>
								{#each section.models as model (model.id)}
									<ModelRow
										{model}
										selected={model.id === selectedModelId}
										pinned={pins.pinnedIds.includes(model.id)}
										detailsOpen={detailsOpenId === model.id}
										ontogglepin={togglePin}
										ontoggledetails={toggleDetails}
										onselect={select}
									/>
								{/each}
							</Command.GroupItems>
						</Command.Group>
					{/each}
				</Command.List>
			</Command.Root>

			{#if canChooseThinking}
				<!-- Outside Command.Root, so the list's arrow-key navigation does not
				     try to treat the switch as one more model. -->
				<div class="flex items-center gap-3 border-t border-line px-4 py-3">
					<span class="flex-1">
						<span id={thinkingLabelId} class="block text-sm">Thinking</span>
						<span class="block text-xs text-faint">
							Works through the problem first. Slower, and costs more.
						</span>
					</span>
					<button
						type="button"
						role="switch"
						aria-checked={thinking}
						aria-labelledby={thinkingLabelId}
						onclick={() => {
							onthinkingchange(!thinking);
						}}
						class="h-5 w-9 shrink-0 rounded-full p-0.5 transition-colors {thinking
							? 'bg-accent'
							: 'bg-line'}"
					>
						<span
							class="block size-4 rounded-full bg-white transition-transform {thinking
								? 'translate-x-4'
								: ''}"
						></span>
					</button>
				</div>
			{/if}
		</Dialog.Content>
	</Dialog.Portal>
</Dialog.Root>
