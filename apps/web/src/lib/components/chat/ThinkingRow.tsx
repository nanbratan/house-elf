import { useId } from 'react';

import { Field, FieldContent, FieldDescription, FieldLabel } from '../ui/field.tsx';
import { Switch } from '../ui/switch.tsx';

export interface ThinkingRowProps {
	thinking: boolean;
	onThinkingChange: (thinking: boolean) => void;
}

/** The footer's thinking switch. Sits outside the listbox so arrow-key navigation never treats it as a model. */
export function ThinkingRow({ thinking, onThinkingChange }: ThinkingRowProps) {
	const switchId = `${useId()}-thinking`;

	// base-ui calls this with (checked, eventDetails); only the first is our contract.
	function handleCheckedChange(checked: boolean) {
		onThinkingChange(checked);
	}

	return (
		<Field orientation="horizontal" className="border-t border-border px-4 py-3">
			<FieldContent>
				<FieldLabel htmlFor={switchId}>Thinking</FieldLabel>
				<FieldDescription>
					Works through the problem first. Slower, and costs more.
				</FieldDescription>
			</FieldContent>
			<Switch id={switchId} checked={thinking} onCheckedChange={handleCheckedChange} />
		</Field>
	);
}
