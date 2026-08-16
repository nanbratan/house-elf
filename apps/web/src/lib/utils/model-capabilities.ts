import type { CostTier, SelectableModel } from '@house-elf/shared';
import {
	COST_TIERS,
	EFFORT_MEANING_OFF,
	REASONING_EFFORTS,
	supportsCostTier
} from '@house-elf/shared';

/**
 * What the settings panel may offer for one model.
 *
 * Mirrors the checks in `apps/server/src/mastra/chat-settings.ts`: a control the
 * server refuses is a control whose only effect is a 400.
 */
export interface ModelCapabilities {
	readonly canThink: boolean;
	/** The model thinks regardless, so there is no off to offer. */
	readonly thinkingMandatory: boolean;
	/** Levels least to most, or empty when the model takes no effort level. */
	readonly efforts: readonly string[];
	/** `undefined` when the model publishes none, or publishes `none`, which is not a level. */
	readonly defaultEffort: string | undefined;
	readonly canSetTemperature: boolean;
	readonly defaultTemperature: number | undefined;
	/** Empty unless the model is one of the two routers that route by cost. */
	readonly costTiers: readonly CostTier[];
}

function advertises(model: SelectableModel, parameter: string): boolean {
	return model.supportedParameters.includes(parameter);
}

/** OpenRouter publishes `supportedEfforts` in arbitrary order. Levels it does not name sort last. */
function orderEfforts(efforts: readonly string[]): string[] {
	function rank(effort: string): number {
		const index = REASONING_EFFORTS.findIndex((known) => known === effort);
		return index === -1 ? REASONING_EFFORTS.length : index;
	}

	return [...efforts].sort(
		(effort, other) => rank(effort) - rank(other) || effort.localeCompare(other)
	);
}

/**
 * The model's own list, or OpenRouter's for one that takes the parameter and
 * publishes none — today only the two auto routers.
 *
 * `none` is dropped: the server refuses it as an effort, since `mode: 'off'`
 * already says it.
 */
function acceptedEfforts(model: SelectableModel): string[] {
	if (!advertises(model, 'reasoning_effort')) return [];
	const published = model.reasoning?.supportedEfforts ?? REASONING_EFFORTS;
	return orderEfforts(published.filter((effort) => effort !== EFFORT_MEANING_OFF));
}

export function modelCapabilities(model: SelectableModel): ModelCapabilities {
	const canThink = advertises(model, 'reasoning');
	const canSetTemperature = advertises(model, 'temperature');
	const efforts = canThink ? acceptedEfforts(model) : [];
	const publishedDefault = model.reasoning?.defaultEffort;

	return {
		canThink,
		// `supportedParameters` is the authority, not the `reasoning` object: the
		// live catalog has models carrying one without the other.
		thinkingMandatory: canThink && model.reasoning?.mandatory === true,
		efforts,
		// A default outside the offered levels could not be shown as selected.
		defaultEffort:
			publishedDefault !== undefined && efforts.includes(publishedDefault)
				? publishedDefault
				: undefined,
		canSetTemperature,
		defaultTemperature: canSetTemperature ? model.defaultParameters.temperature : undefined,
		costTiers: supportsCostTier(model.id) ? COST_TIERS : []
	};
}

/** False when the panel would open on nothing the reader can change or be told. */
export function hasSettings(capabilities: ModelCapabilities): boolean {
	return (
		capabilities.canThink || capabilities.canSetTemperature || capabilities.costTiers.length > 0
	);
}
