import { ChevronDownIcon } from 'lucide-react';

export interface ModelListHeadingProps {
	title: string;
	/** True for the pinned heading, the only one that folds its rows away. */
	collapsible: boolean;
	collapsed: boolean;
	onToggleCollapsed: () => void;
}

/**
 * A break in the model list.
 *
 * `presentation`, not a group or a heading role: the list is a flat listbox, so
 * the rows state their own position and this is only text between them.
 */
export function ModelListHeading({
	title,
	collapsible,
	collapsed,
	onToggleCollapsed
}: ModelListHeadingProps) {
	return (
		<div
			role="presentation"
			data-testid="list-heading"
			className="px-2 pt-3 pb-1 text-xs font-medium tracking-wide text-faint"
		>
			{collapsible ? (
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
					{title}
				</button>
			) : (
				title
			)}
		</div>
	);
}
