import type { ReactNode } from 'react';

import { FieldLabel } from '../ui/field.tsx';
import { FieldHint } from './FieldHint.tsx';
import { SettingResetButton } from './SettingResetButton.tsx';

export interface SettingHeaderProps {
	label: string;
	/** The current value, shown beside the label so the control never has to be read. */
	value?: string;
	/** What the setting does. Behind the info icon, not printed under the field. */
	hint: string;
	/** The id of the control this labels, when the control is a single element. */
	htmlFor?: string;
	onReset?: () => void;
	/** Shown only when the value differs from its default. */
	showReset?: boolean;
	children?: ReactNode;
}

/** One field's top line: `[label] [info] [value] … [reset] [control]`. */
export function SettingHeader({
	label,
	value,
	hint,
	htmlFor,
	onReset,
	showReset,
	children
}: SettingHeaderProps) {
	return (
		<div className="flex items-center gap-2">
			{/* Siblings: a label forwards clicks to its control, so a button nested
			    inside it would toggle the switch as well as open the hint. */}
			<div className="flex shrink-0 items-center gap-1">
				<FieldLabel htmlFor={htmlFor} className="font-normal text-muted-foreground">
					{label}
				</FieldLabel>
				<FieldHint setting={label.toLowerCase()}>{hint}</FieldHint>
			</div>
			{value === undefined ? null : (
				<span className="min-w-0 truncate text-sm font-medium text-foreground capitalize tabular-nums">
					{value}
				</span>
			)}

			<div className="ms-auto flex shrink-0 items-center gap-1.5">
				{showReset && onReset ? (
					<SettingResetButton setting={label.toLowerCase()} onReset={onReset} />
				) : null}
				{children}
			</div>
		</div>
	);
}
