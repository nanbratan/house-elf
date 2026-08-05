<script lang="ts">
	import type { SelectableModel } from '@house-elf/shared';
	import { Command, Dialog } from 'bits-ui';

	import { modelSections, providerName } from '$lib/utils/model-list';

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
	const selectedModel = $derived(models.find((model) => model.id === selectedModelId));

	const sections = $derived(modelSections(models, search));
	const matchCount = $derived(
		sections.reduce((count, section) => count + section.models.length, 0)
	);

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
				class="flex max-h-[min(30rem,80vh)] flex-col"
			>
				<div class="flex items-center gap-2 border-b border-line px-3">
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
					<!-- Live, because it is how a filter or a search announces that it did
					     something before the reader scrolls to find out. -->
					<span aria-live="polite" class="shrink-0 text-xs text-faint">
						{matchCount === 1 ? '1 model' : `${String(matchCount)} models`}
					</span>
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
										class="flex cursor-default items-center gap-2 rounded-lg px-2 py-2 text-sm outline-none data-selected:bg-raised"
									>
										<span class="min-w-0 flex-1 truncate">{model.label}</span>
										<!-- On screen because it is searchable: a model must not drop
										     out of the list for a reason that was never shown. -->
										<span class="shrink-0 text-xs text-faint">{providerName(model)}</span>
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
