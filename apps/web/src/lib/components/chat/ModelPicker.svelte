<script lang="ts">
	import type { ModelFamily, SelectableModel } from '@house-elf/shared';
	import { Command, Dialog } from 'bits-ui';

	const familyLabels: Record<ModelFamily, string> = {
		opus: 'Opus',
		sonnet: 'Sonnet',
		haiku: 'Haiku'
	};
	const componentId = $props.id();
	const modelListId = `${componentId}-model-list`;

	interface ModelPickerProps {
		models: readonly SelectableModel[];
		selectedModelId: string;
		onselect: (modelId: string) => void;
	}

	let { models, selectedModelId, onselect }: ModelPickerProps = $props();

	let open = $state(false);
	let search = $state('');
	const selectedModel = $derived(models.find((model) => model.id === selectedModelId));

	function matchesSearch(model: SelectableModel, query: string) {
		if (query === '') return true;
		return [model.label, model.family, model.generation, model.id].some((field) =>
			field.toLowerCase().includes(query)
		);
	}

	const groups = $derived.by(() => {
		const query = search.trim().toLowerCase();

		return Object.entries(familyLabels)
			.map(([family, label]) => ({
				family,
				label,
				models: models.filter((model) => model.family === family && matchesSearch(model, query))
			}))
			.filter((group) => group.models.length > 0);
	});

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
		aria-label={`Choose model. Current model: ${selectedModel?.label ?? 'none'}`}
		class="flex h-8 min-w-0 items-center gap-1.5 rounded-md px-2 text-xs text-muted transition-colors hover:bg-canvas hover:text-content"
	>
		<span class="max-w-32 truncate">{selectedModel?.label ?? 'Choose model'}</span>
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
				value={selectedModel?.label ?? ''}
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
				</div>

				<Command.List id={modelListId} class="overflow-y-auto p-1.5">
					{#if groups.length === 0}
						<div class="px-3 py-8 text-center text-sm text-faint">No models found.</div>
					{/if}

					{#each groups as group (group.family)}
						<Command.Group value={group.family}>
							<Command.GroupHeading class="px-2 py-1.5 text-xs font-medium text-faint capitalize">
								{group.label}
							</Command.GroupHeading>
							<Command.GroupItems>
								{#each group.models as model (model.id)}
									<Command.Item
										value={model.label}
										onSelect={() => {
											select(model.id);
										}}
										aria-label={model.label}
										class="flex cursor-default items-center rounded-lg px-2 py-2 text-sm outline-none data-selected:bg-raised"
									>
										<span class="flex-1">{model.label}</span>
										{#if model.id === selectedModelId}
											<svg
												class="size-4 text-accent"
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
		</Dialog.Content>
	</Dialog.Portal>
</Dialog.Root>
