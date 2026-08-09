import type { SelectableModel } from '@house-elf/shared';
import { ChevronDownIcon } from 'lucide-react';

import { ModelSelectorGroup } from '../vendor/ai-elements/model-selector.tsx';
import { ModelRow } from './ModelRow.tsx';

export interface PinnedSectionProps {
	/** The pinned models, resolved from the catalog and sorted. */
	models: readonly SelectableModel[];
	/**
	 * The currently selected model id. Passed through to each row so the
	 * selected pin shows its checkmark, same as a row in the main list.
	 */
	selectedModelId: string;
	/** Whether the section is folded away. */
	collapsed: boolean;
	/** Folds or unfolds the section. */
	onToggleCollapsed: () => void;
	/** Pin or unpin a model from a row's star. */
	onTogglePin: (modelId: string) => void;
	/** Toggle the details panel for a row. */
	onToggleDetails: (modelId: string) => void;
	/** Select a model — the whole row is a click target. */
	onSelect: (modelId: string) => void;
	/**
	 * The id of the row whose details are open, or null. An accordion: one panel
	 * open at a time, shared with the main list.
	 */
	detailsOpenId: string | null;
}

export function PinnedSection({
	models,
	selectedModelId,
	collapsed,
	onToggleCollapsed,
	onTogglePin,
	onToggleDetails,
	onSelect,
	detailsOpenId
}: PinnedSectionProps) {
	return (
		<div data-testid="pinned-section">
			{/*
			 * cmdk renders a group's `heading` inside an `aria-hidden` container, so
			 * an interactive collapse toggle placed there would be unreachable by
			 * assistive tech. The heading lives here, as ordinary markup.
			 */}
			<div className="px-2 pt-3 pb-1 text-xs font-medium tracking-wide text-faint">
				<button
					type="button"
					onClick={onToggleCollapsed}
					aria-expanded={!collapsed}
					className="flex w-full items-center gap-1"
				>
					<ChevronDownIcon
						className={`size-3 shrink-0 transition-transform ${collapsed ? '-rotate-90' : ''}`}
						aria-hidden="true"
					/>
					Pinned ({models.length})
				</button>
			</div>

			{!collapsed ? (
				<ModelSelectorGroup value="pinned">
					{models.map((model) => (
						<ModelRow
							key={model.id}
							model={model}
							selected={model.id === selectedModelId}
							pinned
							detailsOpen={detailsOpenId === model.id}
							onTogglePin={onTogglePin}
							onToggleDetails={onToggleDetails}
							onSelect={onSelect}
						/>
					))}
				</ModelSelectorGroup>
			) : null}
		</div>
	);
}
