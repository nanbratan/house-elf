<script lang="ts">
	import type { SelectableModel } from '@house-elf/shared';
	import { Command, Dialog } from 'bits-ui';

	import ModelDetails from '$lib/components/chat/ModelDetails.svelte';
	import ModelFilters from '$lib/components/chat/ModelFilters.svelte';
	import { filterModels, type ModelFilters as Filters, noFilters } from '$lib/utils/model-filters';
	import { releaseSections, searchSections } from '$lib/utils/model-list';

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

	let open = $state(false);
	let search = $state('');
	let filters = $state<Filters>(noFilters);
	// One details panel open at a time — an accordion, not a row of toggles, so
	// the list does not grow a second scroll inside itself.
	let detailsOpenId = $state<string | null>(null);
	const selectedModel = $derived(models.find((model) => model.id === selectedModelId));

	const listed = $derived(filterModels(models, filters));

	// Grouping depends on the catalog and the filters, so a keystroke in the
	// search box re-runs the search and nothing else.
	const grouped = $derived(releaseSections(listed));
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
					{#if sections.length === 0}
						<div class="px-3 py-8 text-center text-sm text-faint">No models found.</div>
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
									<Command.Item
										value={model.id}
										onSelect={() => {
											select(model.id);
										}}
										aria-label={model.label}
										class="flex cursor-default flex-col gap-1 rounded-lg px-2 py-2 text-sm outline-none data-selected:bg-raised"
									>
										<div class="flex items-center gap-2">
											<span class="min-w-0 flex-1 truncate">{model.label}</span>
											{#if model.id === selectedModelId}
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
											<!-- "More" sits at the far right edge so a thumb finds it in
											     the same place on every row. The label is flex-1, so it
											     absorbs the space the checkmark takes on the selected row —
											     "More" never shifts when the checkmark appears. The
											     checkmark stays just left of "More" (right of the label)
											     rather than moving to the far left: a selection indicator
											     on the right reads as "this one", and keeps the label
											     flush left where a scanning eye starts. -->
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
														detailsOpenId = detailsOpenId === model.id ? null : model.id;
													}}
													aria-expanded={detailsOpenId === model.id}
													class="shrink-0 text-xs text-muted transition-colors hover:text-content"
												>
													{detailsOpenId === model.id ? 'Less' : 'More'}
												</button>
											</span>
										</div>
										<!-- Details live inside the Command.Item so they move with it,
										     but the "show more/less" toggle inside them must not select
										     the model. Stopping propagation keeps the click from reaching
										     the item's onSelect, so a reader can read the whole
										     description without committing to the model. -->
										<!-- svelte-ignore a11y_no_static_element_interactions -->
										<div
											onclick={(event) => {
												event.stopPropagation();
											}}
											onkeydown={(event) => {
												event.stopPropagation();
											}}
										>
											<ModelDetails {model} open={detailsOpenId === model.id} />
										</div>
									</Command.Item>
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
