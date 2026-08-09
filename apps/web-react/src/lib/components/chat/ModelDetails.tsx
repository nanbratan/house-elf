import type { SelectableModel } from '@house-elf/shared';

import { priceLabel, settingList, warnings } from '../../utils/model-details.ts';

export interface ModelDetailsProps {
	model: SelectableModel;
	/** Whether the prose details are currently expanded. */
	open: boolean;
}

/** The picker's "More" panel: a model's warnings, description and specs. */
export function ModelDetails({ model, open }: ModelDetailsProps) {
	if (!open) return null;

	const modelWarnings = warnings(model);
	const settings = settingList(model);

	return (
		<div className="mt-2 space-y-2 border-t border-border pt-2 text-xs text-muted-foreground">
			{modelWarnings.length > 0 ? (
				<ul className="flex flex-wrap gap-x-3 gap-y-0.5">
					{modelWarnings.map((warning) => (
						<li key={warning.id} className="text-amber-400">
							{warning.label}
						</li>
					))}
				</ul>
			) : null}
			<p>{model.description}</p>
			<dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5">
				<dt className="text-faint">Context</dt>
				<dd>{model.contextLength.toLocaleString()} tokens</dd>
				<dt className="text-faint">Price</dt>
				<dd>{priceLabel(model)}</dd>
				{model.knowledgeCutoff ? (
					<>
						<dt className="text-faint">Knowledge cutoff</dt>
						<dd>{model.knowledgeCutoff}</dd>
					</>
				) : null}
				<dt className="text-faint">Inputs</dt>
				<dd>{model.inputModalities.join(', ')}</dd>
				<dt className="text-faint">Settings</dt>
				<dd>{settings.length > 0 ? settings.join(', ') : 'none'}</dd>
			</dl>
		</div>
	);
}
