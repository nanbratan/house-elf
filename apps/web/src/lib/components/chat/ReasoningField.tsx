import { useId } from 'react';

import { Field } from '../ui/field.tsx';
import { Switch } from '../ui/switch.tsx';
import { LevelSlider } from './LevelSlider.tsx';
import { ScaleCaptions } from './ScaleCaptions.tsx';
import { SettingHeader } from './SettingHeader.tsx';

export interface ReasoningFieldProps {
	/** The model thinks whatever it is told, so the switch is on and disabled. */
	mandatory: boolean;
	/** Levels least to most, or empty when the model takes no effort level. */
	efforts: readonly string[];
	thinking: boolean;
	/** The selected level. Always one of `efforts` — never a made-up option. */
	effort: string;
	/** The level the reset returns to. */
	defaultEffort: string;
	onThinkingChange: (thinking: boolean) => void;
	onEffortChange: (effort: string) => void;
}

const THINKING_HINT = 'Works through the problem before answering. Slower, and costs more.';
const MANDATORY_HINT = 'This model always thinks. It cannot be asked to stop.';
const EFFORT_HINT =
	'How long the model thinks before answering. Higher levels are slower and cost more. The level it starts on is the one the model already uses.';

/**
 * Whether the model thinks, and how hard.
 *
 * A mandatory-reasoning model still renders the switch, on and disabled: hiding
 * it would leave the reader assuming the opposite.
 */
export function ReasoningField({
	mandatory,
	efforts,
	thinking,
	effort,
	defaultEffort,
	onThinkingChange,
	onEffortChange
}: ReasoningFieldProps) {
	const switchId = `${useId()}-thinking`;

	// base-ui calls this with (checked, eventDetails); only the first is our contract.
	function handleThinkingToggle(checked: boolean) {
		onThinkingChange(checked);
	}

	function handleEffortReset() {
		onEffortChange(defaultEffort);
	}

	return (
		<div className="flex flex-col gap-2.5">
			<Field>
				<SettingHeader
					label="Thinking"
					hint={mandatory ? MANDATORY_HINT : THINKING_HINT}
					htmlFor={switchId}
				>
					<Switch
						id={switchId}
						checked={thinking}
						disabled={mandatory}
						onCheckedChange={handleThinkingToggle}
					/>
				</SettingHeader>
			</Field>

			{thinking && efforts.length > 0 ? (
				<Field>
					<SettingHeader
						label="Effort"
						value={effort}
						hint={EFFORT_HINT}
						onReset={handleEffortReset}
						showReset={effort !== defaultEffort}
					/>
					{/* One catalog model publishes a single level, and base-ui rejects a
					    slider whose min equals its max. The header still names it. */}
					{efforts.length > 1 ? (
						<>
							<ScaleCaptions minLabel="Faster" maxLabel="Smarter" />
							<LevelSlider
								label="Effort"
								levels={efforts}
								value={effort}
								onChange={onEffortChange}
							/>
						</>
					) : null}
				</Field>
			) : null}
		</div>
	);
}
