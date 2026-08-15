import type { SelectableModel } from '@house-elf/shared';
import { ChevronDownIcon } from 'lucide-react';
import { useId, useState } from 'react';

import {
	activeFilterCount,
	availableCapabilities,
	availableModalities,
	availableProviders,
	FREE,
	type ModelFilters as ModelFiltersValue,
	noFilters
} from '../../utils/model-filters.ts';
import {
	Combobox,
	ComboboxCollection,
	ComboboxContent,
	ComboboxEmpty,
	ComboboxInput,
	ComboboxItem,
	ComboboxList,
	ComboboxTrigger
} from '../ui/combobox.tsx';
import { Select, SelectContent, SelectItem, SelectTrigger } from '../ui/select.tsx';

/** Shared by all three filter triggers, so the row reads as one set of pills. */
const pill =
	'flex h-auto items-center gap-1.5 rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:text-foreground data-[popup-open]:border-ring';

export interface ModelFiltersProps {
	/**
	 * The whole catalog, not the narrowed list — the row describes what can be
	 * asked for, so a filter must not vanish the moment it is used.
	 */
	models: readonly SelectableModel[];
	/**
	 * What the list is currently narrowed to. Held by the caller, not here: the
	 * row unmounts with the picker, and a copy kept here would be lost on close
	 * while the caller went on filtering the list by the answers it still held.
	 */
	filters: ModelFiltersValue;
	onChange: (filters: ModelFiltersValue) => void;
}

export function ModelFilters({ models, filters, onChange }: ModelFiltersProps) {
	const panelId = `${useId()}-filter-panel`;

	// Open on mount if answers carried over, so the row shows what is narrowing
	// the list rather than hiding it behind the funnel.
	const [shown, setShown] = useState(() => activeFilterCount(filters) > 0);

	const chosenProviders = [...filters.providers];
	const chosenModalities = [...filters.modalities];
	const chosenCanDo = [...filters.capabilities].filter((capability) => capability !== FREE);
	const free = filters.capabilities.has(FREE);

	const capabilities = availableCapabilities(models);
	const canDo = capabilities.filter((capability) => capability.id !== FREE);
	const freeIsWorthAsking = capabilities.some((capability) => capability.id === FREE);
	const providers = availableProviders(models);
	const providerNames = providers.map((provider) => provider.name);
	const providerCounts = new Map(providers.map((provider) => [provider.name, provider.count]));
	const modalities = availableModalities(models);
	const filterCount = activeFilterCount(filters);

	function report(next: {
		providers?: readonly string[];
		modalities?: readonly string[];
		canDo?: readonly string[];
		free?: boolean;
	}) {
		const providers = next.providers ?? chosenProviders;
		const modalities = next.modalities ?? chosenModalities;
		const canDo = next.canDo ?? chosenCanDo;
		const isFree = next.free ?? free;

		onChange({
			providers: new Set(providers),
			modalities: new Set(modalities),
			capabilities: new Set(isFree ? [...canDo, FREE] : canDo)
		});
	}

	return (
		<>
			<button
				type="button"
				aria-label="Filters"
				aria-expanded={shown}
				aria-controls={panelId}
				onClick={() => {
					setShown((value) => !value);
				}}
				className="flex shrink-0 items-center gap-1 rounded-md px-1.5 py-1 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
			>
				<svg
					className="size-4"
					viewBox="0 0 16 16"
					fill="none"
					stroke="currentColor"
					strokeWidth={1.5}
					aria-hidden="true"
				>
					<path d="M2.5 3.5h11l-4.25 5v4l-2.5 1.5v-5.5z" />
				</svg>
				{filterCount > 0 ? (
					<span className="rounded-full bg-primary px-1.5 text-[0.625rem] text-primary-foreground">
						{filterCount}
					</span>
				) : null}
			</button>

			{shown ? (
				<div
					id={panelId}
					className="flex w-full flex-wrap items-center gap-1.5 border-t border-border py-2.5"
				>
					{/* The catalog carries sixty-odd providers, the one list long enough
					    that typing beats scrolling. */}
					<Combobox
						multiple
						items={providerNames}
						value={chosenProviders}
						onValueChange={(value) => {
							report({ providers: value });
						}}
					>
						<ComboboxTrigger aria-label="Provider" className={pill}>
							<span>Provider</span>
							{chosenProviders.length > 0 ? (
								<span className="rounded-full bg-primary px-1.5 text-[0.625rem] text-primary-foreground">
									{chosenProviders.length}
								</span>
							) : null}
							<ChevronDownIcon className="size-3 text-faint" aria-hidden="true" />
						</ComboboxTrigger>
						<ComboboxContent className="w-56">
							<ComboboxInput aria-label="Search providers" placeholder="Search providers" />
							<ComboboxList>
								<ComboboxCollection>
									{(provider: string) => (
										<ComboboxItem key={provider} value={provider}>
											<span className="flex-1 truncate">{provider}</span>
											<span className="text-xs text-faint">{providerCounts.get(provider)}</span>
										</ComboboxItem>
									)}
								</ComboboxCollection>
							</ComboboxList>
							<ComboboxEmpty>No provider matches</ComboboxEmpty>
						</ComboboxContent>
					</Combobox>

					{/* `modal` defaults to true on Select and false on Combobox; a filter
					    pill is not a modal surface, so all three popups leave the page
					    scrollable and the rest of the row reachable. */}
					<Select
						multiple
						modal={false}
						value={chosenModalities}
						onValueChange={(value) => {
							report({ modalities: value });
						}}
					>
						<SelectTrigger aria-label="Accepts" className={pill}>
							<span>Accepts</span>
							{chosenModalities.length > 0 ? (
								<span className="rounded-full bg-primary px-1.5 text-[0.625rem] text-primary-foreground">
									{chosenModalities.length}
								</span>
							) : null}
							<ChevronDownIcon className="size-3 text-faint" aria-hidden="true" />
						</SelectTrigger>
						<SelectContent align="start" alignItemWithTrigger={false} className="w-48">
							{modalities.map((modality) => (
								<SelectItem key={modality} value={modality}>
									{modality}
								</SelectItem>
							))}
						</SelectContent>
					</Select>

					{canDo.length > 0 ? (
						<Select
							multiple
							modal={false}
							value={chosenCanDo}
							onValueChange={(value) => {
								report({ canDo: value });
							}}
						>
							<SelectTrigger aria-label="Can do" className={pill}>
								<span>Can do</span>
								{chosenCanDo.length > 0 ? (
									<span className="rounded-full bg-primary px-1.5 text-[0.625rem] text-primary-foreground">
										{chosenCanDo.length}
									</span>
								) : null}
								<ChevronDownIcon className="size-3 text-faint" aria-hidden="true" />
							</SelectTrigger>
							<SelectContent align="start" alignItemWithTrigger={false} className="w-48">
								{canDo.map((capability) => (
									<SelectItem key={capability.id} value={capability.id}>
										{capability.label}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					) : null}

					{freeIsWorthAsking ? (
						<button
							type="button"
							aria-pressed={free}
							onClick={() => {
								report({ free: !free });
							}}
							className="rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:text-foreground aria-pressed:border-ring aria-pressed:text-foreground"
						>
							Free
						</button>
					) : null}

					{/* Undoing by hand means reopening each pill and unticking each answer,
					    which is the one thing the row makes harder than it needs to be. */}
					{filterCount > 0 ? (
						<button
							type="button"
							aria-label="Clear filters"
							onClick={() => {
								onChange(noFilters);
							}}
							className="px-1.5 py-1 text-xs text-faint underline-offset-4 transition-colors hover:text-foreground hover:underline"
						>
							Clear
						</button>
					) : null}
				</div>
			) : null}
		</>
	);
}
