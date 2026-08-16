import type { CostTier } from '@house-elf/shared';

import type { ModelCapabilities } from './model-capabilities.ts';
import {
	TEMPERATURE_MAX,
	TEMPERATURE_MIN,
	type StoredModelSettings
} from './stored-model-settings.ts';

export { TEMPERATURE_MAX, TEMPERATURE_MIN };

export const TEMPERATURE_STEP = 0.1;

/** Where the slider starts when the model publishes no default. Not sent until switched on. */
const TEMPERATURE_SLIDER_START = 1;

/** OpenRouter reasons at `medium` when a request enables reasoning but names no level. */
const OPENROUTER_DEFAULT_EFFORT = 'medium';

/** OpenRouter routes an unset request "as if you had asked for roughly the `low` band". */
export const OPENROUTER_DEFAULT_COST_TIER = 'low';

/** One model's settings as they now stand, with every capability rule applied. */
export interface ResolvedSettings {
	readonly thinking: boolean;
	/** Always one of the model's own levels. */
	readonly effort: string;
	/** The level the reset returns to, and the one not worth sending. */
	readonly defaultEffort: string;
	readonly effortSent: boolean;
	/** Where the slider rests, whether or not that value is sent. */
	readonly temperature: number | undefined;
	readonly sendsTemperature: boolean;
	readonly costTier: CostTier;
}

/** Never returns a level the model does not offer. */
function defaultEffortFor(capabilities: ModelCapabilities): string {
	const openRouterDefault = capabilities.defaultEffort ?? OPENROUTER_DEFAULT_EFFORT;
	if (capabilities.efforts.length === 0 || capabilities.efforts.includes(openRouterDefault)) {
		return openRouterDefault;
	}
	return capabilities.efforts[0] ?? openRouterDefault;
}

/**
 * Turns what is stored into what is true right now.
 *
 * Every control resolves to a value the panel can show as selected. What
 * separates shown from sent is whether it differs from the default.
 */
export function resolveSettings(
	capabilities: ModelCapabilities,
	stored: StoredModelSettings
): ResolvedSettings {
	const thinking =
		capabilities.thinkingMandatory || (capabilities.canThink && stored.thinking === true);

	const defaultEffort = defaultEffortFor(capabilities);
	const effort =
		stored.effort !== undefined && capabilities.efforts.includes(stored.effort)
			? stored.effort
			: defaultEffort;

	const { defaultTemperature } = capabilities;
	const temperature = capabilities.canSetTemperature
		? (stored.temperature ?? defaultTemperature ?? TEMPERATURE_SLIDER_START)
		: undefined;
	// A published default is compared against; without one, nothing is sent until
	// the reader switches temperature on.
	const sendsTemperature =
		temperature !== undefined &&
		(defaultTemperature === undefined
			? stored.temperatureOn === true
			: temperature !== defaultTemperature);

	const costTier =
		stored.costTier !== undefined && capabilities.costTiers.includes(stored.costTier)
			? stored.costTier
			: OPENROUTER_DEFAULT_COST_TIER;

	return {
		thinking,
		effort,
		defaultEffort,
		effortSent: thinking && effort !== defaultEffort,
		temperature,
		sendsTemperature,
		costTier
	};
}
