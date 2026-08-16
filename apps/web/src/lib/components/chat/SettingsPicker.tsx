import type { CostTier, SelectableModel } from '@house-elf/shared';
import { supportsCostTier } from '@house-elf/shared';

import { hasSettings, modelCapabilities } from '../../utils/model-capabilities.ts';
import { resolveSettings, OPENROUTER_DEFAULT_COST_TIER } from '../../utils/model-settings.ts';
import { settingsSummary } from '../../utils/settings-summary.ts';
import type { StoredModelSettings } from '../../utils/stored-model-settings.ts';
import { Popover, PopoverContent, PopoverTitle } from '../ui/popover.tsx';
import { CostTierField } from './CostTierField.tsx';
import { ReasoningField } from './ReasoningField.tsx';
import { SettingsPickerTrigger } from './SettingsPickerTrigger.tsx';
import { TemperatureField } from './TemperatureField.tsx';

export interface SettingsPickerProps {
	/** The model these settings belong to. Switching it swaps the whole panel. */
	model: SelectableModel;
	restored: boolean;
	stored: StoredModelSettings;
	onChange: <Field extends keyof StoredModelSettings>(
		field: Field,
		value: StoredModelSettings[Field]
	) => void;
}

/**
 * How the selected model answers, as opposed to which model it is.
 *
 * Which fields exist is derived on every render rather than held in state, so
 * switching models while the panel is open swaps the controls with it.
 */
export function SettingsPicker({ model, restored, stored, onChange }: SettingsPickerProps) {
	const capabilities = modelCapabilities(model);
	const resolved = resolveSettings(capabilities, stored);

	// Off is the default, so it is stored as absence rather than `false`.
	function handleThinkingChange(thinking: boolean) {
		onChange('thinking', thinking ? true : undefined);
	}

	// Returning a control to its default must be indistinguishable from never
	// having moved it.
	function handleEffortChange(effort: string) {
		onChange('effort', effort === resolved.defaultEffort ? undefined : effort);
	}

	function handleTemperatureChange(temperature: number | undefined) {
		onChange('temperature', temperature);
	}

	// Only the switch moves, so switching back on restores the reader's number.
	function handleSendTemperatureChange(sends: boolean) {
		onChange('temperatureOn', sends ? true : undefined);
	}

	function handleCostTierChange(tier: CostTier) {
		onChange('costTier', tier === OPENROUTER_DEFAULT_COST_TIER ? undefined : tier);
	}

	return (
		<Popover>
			<SettingsPickerTrigger
				restored={restored}
				summary={settingsSummary(capabilities, resolved)}
			/>

			<PopoverContent side="top" align="start" className="w-80 max-w-[calc(100vw-2rem)] gap-3.5">
				<PopoverTitle className="text-xs text-muted-foreground">{model.label}</PopoverTitle>

				{hasSettings(capabilities) ? (
					<div className="flex flex-col gap-3.5">
						{capabilities.canThink ? (
							<ReasoningField
								mandatory={capabilities.thinkingMandatory}
								efforts={capabilities.efforts}
								thinking={resolved.thinking}
								effort={resolved.effort}
								defaultEffort={resolved.defaultEffort}
								onThinkingChange={handleThinkingChange}
								onEffortChange={handleEffortChange}
							/>
						) : null}

						{supportsCostTier(model.id) ? (
							<CostTierField
								tiers={capabilities.costTiers}
								value={resolved.costTier}
								onChange={handleCostTierChange}
							/>
						) : null}

						{capabilities.canSetTemperature && resolved.temperature !== undefined ? (
							<TemperatureField
								defaultTemperature={capabilities.defaultTemperature}
								temperature={resolved.temperature}
								sendsTemperature={resolved.sendsTemperature}
								onTemperatureChange={handleTemperatureChange}
								onSendTemperatureChange={handleSendTemperatureChange}
							/>
						) : null}
					</div>
				) : (
					<p className="text-xs text-faint">No settings</p>
				)}
			</PopoverContent>
		</Popover>
	);
}
