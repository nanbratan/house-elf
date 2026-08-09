import type { SelectableModel } from '@house-elf/shared';
import { useId, useState } from 'react';

import { usePinnedModels } from '../../state/pinned-models.ts';
import {
	filterModels,
	noFilters,
	type ModelFilters as Filters
} from '../../utils/model-filters.ts';
import { pinnedModels, releaseSections, searchSections } from '../../utils/model-list.ts';
import {
	ModelSelector,
	ModelSelectorEmpty,
	ModelSelectorGroup,
	ModelSelectorList,
	ModelSelectorTrigger
} from '../vendor/ai-elements/model-selector.tsx';
import { DialogContent, DialogTitle } from '@/registry/default/ui/dialog';
import { Command } from '@/registry/default/ui/command';
import { ModelPickerHeader } from './ModelPickerHeader.tsx';
import { ModelRow } from './ModelRow.tsx';
import { PinnedSection } from './PinnedSection.tsx';
import { ThinkingRow } from './ThinkingRow.tsx';

export interface ModelPickerProps {
	models: readonly SelectableModel[];
	selectedModelId: string;
	onSelect: (modelId: string) => void;
	thinking: boolean;
	/**
	 * False when the current model settles the question itself — it either
	 * always thinks or cannot. The switch is then not rendered at all, rather
	 * than shown disabled: a control that can never be used is just clutter.
	 */
	canChooseThinking: boolean;
	onThinkingChange: (thinking: boolean) => void;
}

export function ModelPicker({
	models,
	selectedModelId,
	onSelect,
	thinking,
	canChooseThinking,
	onThinkingChange
}: ModelPickerProps) {
	const modelListId = `${useId()}-model-list`;

	const pins = usePinnedModels(models);

	const [open, setOpen] = useState(false);
	const [search, setSearch] = useState('');
	const [filters, setFilters] = useState<Filters>(noFilters);
	// One details panel open at a time — an accordion, so the list does not
	// grow a second scroll inside itself.
	const [detailsOpenId, setDetailsOpenId] = useState<string | null>(null);

	const selectedModel = models.find((model) => model.id === selectedModelId);
	const listed = filterModels(models, filters);

	// A pinned model renders in the pinned section, not the browse list: two
	// cmdk items sharing one `value` would share one highlight state. Search
	// still sees pinned ids — a pin is a model the reader can look up by name.
	const pinned = pinnedModels(models, pins.pinnedIds);
	const showPinned = pinned.length > 0 && search.trim() === '';
	const pinnedIdSet = new Set(pinned.map((model) => model.id));
	const browseList = listed.filter((model) => !pinnedIdSet.has(model.id));

	const sections =
		search.trim() === '' ? releaseSections(browseList) : searchSections(listed, search);
	// While searching the pinned section is hidden and `sections` already
	// includes pinned ids, so nothing is added to the count.
	const listedCount =
		sections.reduce((count, { models: found }) => count + found.length, 0) +
		(showPinned ? pinned.length : 0);
	const countLabel = listedCount === 1 ? '1 model' : `${String(listedCount)} models`;

	function select(modelId: string) {
		setSearch('');
		onSelect(modelId);
		setOpen(false);
	}

	function togglePin(modelId: string) {
		pins.toggle(modelId);
	}

	function toggleDetails(modelId: string) {
		setDetailsOpenId((current) => (current === modelId ? null : modelId));
	}

	return (
		<ModelSelector open={open} onOpenChange={setOpen}>
			<ModelSelectorTrigger
				aria-label={`Choose model. Current model: ${selectedModel?.label ?? 'none'}${
					thinking ? ', thinking on' : ''
				}`}
				className="flex h-8 min-w-0 items-center gap-1.5 rounded-md px-2 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
			>
				<span className="max-w-32 truncate">{selectedModel?.label ?? 'Choose model'}</span>
				{thinking ? (
					// Named on the trigger so an expensive setting is never hidden.
					<span className="shrink-0 text-faint">Thinking</span>
				) : null}
				<svg
					className="size-3 shrink-0"
					viewBox="0 0 12 12"
					fill="none"
					stroke="currentColor"
					strokeWidth={1.5}
					aria-hidden="true"
				>
					<path d="m3 4.5 3 3 3-3" />
				</svg>
			</ModelSelectorTrigger>

			{/*
			 * ModelSelectorContent is not used: it hardcodes its own `<Command>` with no
			 * prop forwarding, so it cannot carry `defaultValue`/`shouldFilter={false}`/
			 * `loop`. The shell's list primitives below ARE used.
			 */}
			<DialogContent
				showCloseButton={false}
				className="w-[min(26rem,calc(100vw-2rem))] gap-0 overflow-hidden p-0"
			>
				<DialogTitle className="sr-only">Choose a model</DialogTitle>

				<Command
					label="Models"
					defaultValue={selectedModelId}
					shouldFilter={false}
					loop
					className="flex h-[min(30rem,80vh)] flex-col"
				>
					<ModelPickerHeader
						search={search}
						onSearchChange={setSearch}
						listId={modelListId}
						countLabel={countLabel}
						models={models}
						onFiltersChange={setFilters}
					/>

					<ModelSelectorList id={modelListId} className="max-h-none flex-1 overflow-y-auto p-1.5">
						{sections.length === 0 && !showPinned ? (
							<ModelSelectorEmpty className="px-3 py-8 text-faint">
								No models found.
							</ModelSelectorEmpty>
						) : null}

						{showPinned ? (
							<PinnedSection
								models={pinned}
								selectedModelId={selectedModelId}
								collapsed={pins.collapsed}
								onToggleCollapsed={() => {
									pins.toggleCollapsed();
								}}
								onTogglePin={togglePin}
								onToggleDetails={toggleDetails}
								onSelect={select}
								detailsOpenId={detailsOpenId}
							/>
						) : null}

						{sections.map((section) => (
							<ModelSelectorGroup key={section.id} heading={section.title}>
								{section.models.map((model) => (
									<ModelRow
										key={model.id}
										model={model}
										selected={model.id === selectedModelId}
										pinned={pinnedIdSet.has(model.id)}
										detailsOpen={detailsOpenId === model.id}
										onTogglePin={togglePin}
										onToggleDetails={toggleDetails}
										onSelect={select}
									/>
								))}
							</ModelSelectorGroup>
						))}
					</ModelSelectorList>
				</Command>

				{canChooseThinking ? (
					<ThinkingRow thinking={thinking} onThinkingChange={onThinkingChange} />
				) : null}
			</DialogContent>
		</ModelSelector>
	);
}
