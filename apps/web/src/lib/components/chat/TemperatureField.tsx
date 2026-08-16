import { useId } from 'react';

import { TEMPERATURE_MAX, TEMPERATURE_MIN, TEMPERATURE_STEP } from '../../utils/model-settings.ts';
import { Field } from '../ui/field.tsx';
import { Slider } from '../ui/slider.tsx';
import { Switch } from '../ui/switch.tsx';
import { ScaleCaptions } from './ScaleCaptions.tsx';
import { SettingHeader } from './SettingHeader.tsx';

export interface TemperatureFieldProps {
	/** The model's published resting value, or `undefined` if it publishes none. */
	defaultTemperature: number | undefined;
	/** Where the slider rests, whether or not that value is sent. */
	temperature: number;
	/** Whether the request will carry a temperature. Only the reader's to set when there is no default. */
	sendsTemperature: boolean;
	onTemperatureChange: (temperature: number | undefined) => void;
	onSendTemperatureChange: (sends: boolean) => void;
}

const PUBLISHED_HINT =
	'How much the model varies its wording. Lower is steadier and more repeatable, higher is more varied.';
const UNPUBLISHED_HINT =
	'How much the model varies its wording. This model publishes no default, so nothing is sent unless you switch this on and pick a value.';

/**
 * How much the model varies its answers.
 *
 * Two modes: with a published default the slider rests on it and only a
 * differing value is sent. Without one — most models — there is no honest
 * resting position, so a switch gates the slider instead.
 */
export function TemperatureField({
	defaultTemperature,
	temperature,
	sendsTemperature,
	onTemperatureChange,
	onSendTemperatureChange
}: TemperatureFieldProps) {
	const switchId = `${useId()}-temperature`;
	const hasPublishedDefault = defaultTemperature !== undefined;

	// base-ui calls both of these with (value, eventDetails); only the first is
	// our contract.
	function handleValueChange(value: number) {
		onTemperatureChange(value);
	}

	function handleSendTemperatureChange(checked: boolean) {
		onSendTemperatureChange(checked);
	}

	function handleReset() {
		onTemperatureChange(undefined);
	}

	// A published default the slider is already resting on is nothing to return to.
	const showReset = hasPublishedDefault && temperature !== defaultTemperature;

	return (
		<Field>
			<SettingHeader
				label="Temperature"
				value={hasPublishedDefault || sendsTemperature ? temperature.toFixed(1) : undefined}
				hint={hasPublishedDefault ? PUBLISHED_HINT : UNPUBLISHED_HINT}
				htmlFor={hasPublishedDefault ? undefined : switchId}
				onReset={handleReset}
				showReset={showReset}
			>
				{hasPublishedDefault ? null : (
					<Switch
						id={switchId}
						checked={sendsTemperature}
						onCheckedChange={handleSendTemperatureChange}
					/>
				)}
			</SettingHeader>

			{hasPublishedDefault || sendsTemperature ? (
				<>
					<ScaleCaptions minLabel="Precise" maxLabel="Varied" />
					<Slider
						label="Temperature"
						min={TEMPERATURE_MIN}
						max={TEMPERATURE_MAX}
						step={TEMPERATURE_STEP}
						value={temperature}
						onValueChange={handleValueChange}
					/>
				</>
			) : null}
		</Field>
	);
}
