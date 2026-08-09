import type { SelectableModel } from '@house-elf/shared';
import { useId, useState } from 'react';

import {
	availableCapabilities,
	availableModalities,
	availableProviders,
	FREE,
	type ModelFilters as ModelFiltersValue
} from '../../utils/model-filters.ts';
import { FilterSelect } from './FilterSelect.tsx';

export interface ModelFiltersProps {
	/**
	 * The whole catalog, not the narrowed list — the row describes what can be
	 * asked for, so a filter must not vanish the moment it is used.
	 */
	models: readonly SelectableModel[];
	onChange: (filters: ModelFiltersValue) => void;
}

export function ModelFilters({ models, onChange }: ModelFiltersProps) {
	const panelId = `${useId()}-filter-panel`;

	const [shown, setShown] = useState(false);
	const [chosenProviders, setChosenProviders] = useState<string[]>([]);
	const [chosenModalities, setChosenModalities] = useState<string[]>([]);
	const [chosenCanDo, setChosenCanDo] = useState<string[]>([]);
	const [free, setFree] = useState(false);

	const capabilities = availableCapabilities(models);
	const canDo = capabilities.filter((capability) => capability.id !== FREE);
	const freeIsWorthAsking = capabilities.some((capability) => capability.id === FREE);
	const providers = availableProviders(models);
	const modalities = availableModalities(models);
	const filterCount =
		chosenProviders.length + chosenModalities.length + chosenCanDo.length + (free ? 1 : 0);

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
					<FilterSelect
						label="Provider"
						options={providers.map((provider) => ({
							value: provider.name,
							label: provider.name,
							hint: String(provider.count)
						}))}
						value={chosenProviders}
						onValueChange={(value) => {
							setChosenProviders(value);
							report({ providers: value });
						}}
					/>

					<FilterSelect
						label="Accepts"
						options={modalities.map((modality) => ({ value: modality, label: modality }))}
						value={chosenModalities}
						onValueChange={(value) => {
							setChosenModalities(value);
							report({ modalities: value });
						}}
					/>

					{canDo.length > 0 ? (
						<FilterSelect
							label="Can do"
							options={canDo.map((capability) => ({
								value: capability.id,
								label: capability.label
							}))}
							value={chosenCanDo}
							onValueChange={(value) => {
								setChosenCanDo(value);
								report({ canDo: value });
							}}
						/>
					) : null}

					{freeIsWorthAsking ? (
						<button
							type="button"
							aria-pressed={free}
							onClick={() => {
								const next = !free;
								setFree(next);
								report({ free: next });
							}}
							className="rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:text-foreground aria-pressed:border-ring aria-pressed:text-foreground"
						>
							Free
						</button>
					) : null}
				</div>
			) : null}
		</>
	);
}
