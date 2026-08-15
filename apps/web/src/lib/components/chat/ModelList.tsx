import type { ModelListRow } from '../../utils/model-rows.ts';
import { ComboboxList } from '../ui/combobox.tsx';
import { ModelListHeading } from './ModelListHeading.tsx';
import { ModelRow } from './ModelRow.tsx';

export interface ModelListProps {
	/** Headings and models as one flat sequence, in the order they are shown. */
	rows: readonly ModelListRow[];
	/** How many of those rows are models, for each row's `aria-setsize`. */
	itemCount: number;
	selectedModelId: string;
	/** The id of the row whose details are open, or null — an accordion. */
	detailsOpenId: string | null;
	pinnedCollapsed: boolean;
	onToggleCollapsed: () => void;
	onTogglePin: (modelId: string) => void;
	onToggleDetails: (modelId: string) => void;
}

/** The listbox itself: every row the picker is currently showing. */
export function ModelList({
	rows,
	itemCount,
	selectedModelId,
	detailsOpenId,
	pinnedCollapsed,
	onToggleCollapsed,
	onTogglePin,
	onToggleDetails
}: ModelListProps) {
	return (
		<ComboboxList aria-label="Models" className="max-h-none flex-1 overflow-y-auto p-1.5">
			{rows.length === 0 ? (
				// Not `Combobox.Empty`, which keys off the popup this composition
				// never renders.
				<p className="px-3 py-8 text-faint">No models found.</p>
			) : null}

			{rows.map((row) =>
				row.kind === 'heading' ? (
					<ModelListHeading
						key={row.id}
						title={row.title}
						collapsible={row.collapsible}
						collapsed={pinnedCollapsed}
						onToggleCollapsed={onToggleCollapsed}
					/>
				) : (
					<ModelRow
						key={row.id}
						model={row.model}
						selected={row.model.id === selectedModelId}
						pinned={row.pinned}
						detailsOpen={detailsOpenId === row.model.id}
						index={row.itemIndex}
						listedCount={itemCount}
						onTogglePin={onTogglePin}
						onToggleDetails={onToggleDetails}
					/>
				)
			)}
		</ComboboxList>
	);
}
