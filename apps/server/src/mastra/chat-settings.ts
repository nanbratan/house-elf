import type {
	ChatReasoning,
	ChatSettings,
	CostTier,
	CostTierModelId,
	SelectableModel
} from '@house-elf/shared';
import {
	EFFORT_MEANING_OFF,
	REASONING_EFFORTS,
	REASONING_MODE,
	supportsCostTier
} from '@house-elf/shared';
import type { JSONValue } from 'ai';

/**
 * Turns what the reader asked for into the parameters OpenRouter reads, in two
 * passes: `acceptSettings` checks the model's capabilities and is the only thing
 * that throws, `providerOptionsFor` shapes an already-accepted request.
 *
 * A setting the model does not advertise is refused rather than dropped, so a
 * picker bug surfaces as an error and not as a control that does nothing.
 *
 * Keys below are OpenRouter request fields, in its spelling: `@mastra/core`'s
 * bundled `OpenRouterChatLanguageModel` spreads `providerOptions.openrouter` at
 * the root of the request body (`doGenerate`/`doStream`, verified against 1.58.0).
 * That is also the only route in — a model named as a router string cannot reach
 * the model's own settings.
 */

/** Thrown when a request names a setting the selected model will not take. */
export class UnsupportedSettingError extends Error {
	constructor(setting: string, model: SelectableModel, reason: string) {
		super(`Model ${model.id} will not take ${setting}: ${reason}.`);
		this.name = 'UnsupportedSettingError';
	}
}

/**
 * The plugin each cost-tier model routes through. Each slug reads only its own
 * id and ignores the other's in silence, so a wrong id here is a cost tier that
 * appears to work and does nothing.
 *
 * Keyed by `CostTierModelId` rather than `string`, so adding a model to the
 * shared list without naming its plugin here fails to compile — the picker and
 * this map cannot drift apart into a control that only ever 400s.
 */
const COST_TIER_PLUGIN_ID: Record<CostTierModelId, string> = {
	'openrouter/auto': 'auto-router',
	'openrouter/auto-beta': 'auto-beta-router'
};

/** One request's settings, checked against the model. Absent means not sent. */
interface AcceptedSettings {
	reasoning?: { enabled: boolean; effort?: string };
	temperature?: number;
	seed?: number;
	costTier?: { pluginId: string; tier: CostTier };
}

function advertises(model: SelectableModel, parameter: string): boolean {
	return model.supportedParameters.includes(parameter);
}

/**
 * The model's own published list, or OpenRouter's levels for one that advertises
 * the parameter and publishes none — today only the routers.
 *
 * `none` is filtered out because a caller is refused it earlier; without this the
 * refusal message would offer it as a level they could have used.
 */
function acceptedEfforts(model: SelectableModel): readonly string[] {
	const published = model.reasoning?.supportedEfforts ?? REASONING_EFFORTS;
	return published.filter((effort) => effort !== EFFORT_MEANING_OFF);
}

/**
 * Thinking-off is stated out loud rather than left unsaid: models of the Claude 5
 * class think unless told not to.
 *
 * A mandatory-reasoning model is still sent `enabled`, so that an effort reaches
 * it; asking one to stop is refused, since the picker hides that option.
 */
function acceptReasoning(
	model: SelectableModel,
	reasoning: ChatReasoning
): AcceptedSettings['reasoning'] {
	const wantsThinking = reasoning.mode === REASONING_MODE.on;

	if (!advertises(model, 'reasoning')) {
		if (wantsThinking) {
			throw new UnsupportedSettingError('reasoning', model, 'it cannot be asked to think');
		}
		return undefined;
	}

	const effort = reasoning.mode === REASONING_MODE.on ? reasoning.effort : undefined;
	if (effort !== undefined) {
		if (effort === EFFORT_MEANING_OFF) {
			throw new UnsupportedSettingError(
				`the reasoning effort ${JSON.stringify(effort)}`,
				model,
				`it means no reasoning, which is ${REASONING_MODE.off}`
			);
		}
		if (!advertises(model, 'reasoning_effort')) {
			throw new UnsupportedSettingError('a reasoning effort', model, 'it accepts no effort level');
		}
		const accepted = acceptedEfforts(model);
		if (!accepted.includes(effort)) {
			throw new UnsupportedSettingError(
				`the reasoning effort ${JSON.stringify(effort)}`,
				model,
				`it accepts ${accepted.join(', ')}`
			);
		}
	}

	if (model.reasoning?.mandatory === true && !wantsThinking) {
		throw new UnsupportedSettingError('reasoning off', model, 'it always thinks');
	}

	return effort === undefined ? { enabled: wantsThinking } : { enabled: wantsThinking, effort };
}

function acceptCostTier(
	model: SelectableModel,
	tier: CostTier
): NonNullable<AcceptedSettings['costTier']> {
	if (!supportsCostTier(model.id)) {
		throw new UnsupportedSettingError('a cost tier', model, 'only the auto routers route by cost');
	}
	return { pluginId: COST_TIER_PLUGIN_ID[model.id], tier };
}

/** Every capability check for one request, and the only place that refuses. */
function acceptSettings(model: SelectableModel, settings: ChatSettings): AcceptedSettings {
	const accepted: AcceptedSettings = { reasoning: acceptReasoning(model, settings.reasoning) };

	if (settings.temperature !== undefined) {
		if (!advertises(model, 'temperature')) {
			throw new UnsupportedSettingError('a temperature', model, 'it ignores sampling parameters');
		}
		accepted.temperature = settings.temperature;
	}

	if (settings.seed !== undefined) {
		if (!advertises(model, 'seed')) {
			throw new UnsupportedSettingError('a seed', model, 'it cannot sample deterministically');
		}
		accepted.seed = settings.seed;
	}

	if (settings.costTier !== undefined) {
		accepted.costTier = acceptCostTier(model, settings.costTier);
	}

	return accepted;
}

/**
 * Every plugin one request routes through, collected rather than assigned.
 *
 * `plugins` is a single field and Mastra replaces arrays outright when merging
 * provider options, so a contributor that assigned the field would be the only
 * one sent.
 *
 * Compression is switched off explicitly because OpenRouter enables it by
 * default below 8k of context, and the picker offers the whole catalog — a
 * small-context model is one click from dropping the middle of a conversation
 * nobody agreed to lose.
 *
 * Verified live against an 8k endpoint: with the switch off, a request past the
 * window returns a 400 naming the limit rather than being quietly compressed.
 * That refusal is the intended outcome, so treat such a 400 as working.
 */
function pluginsFor(accepted: AcceptedSettings): JSONValue[] {
	const plugins: JSONValue[] = [{ id: 'context-compression', enabled: false }];

	if (accepted.costTier !== undefined) {
		plugins.push({ id: accepted.costTier.pluginId, cost_tier: accepted.costTier.tier });
	}

	return plugins;
}

/** Total: reads no model and refuses nothing, because `acceptSettings` already did. */
function providerOptionsFor(accepted: AcceptedSettings): { openrouter: Record<string, JSONValue> } {
	const openrouter: Record<string, JSONValue> = { plugins: pluginsFor(accepted) };

	if (accepted.reasoning !== undefined) openrouter.reasoning = accepted.reasoning;
	if (accepted.temperature !== undefined) openrouter.temperature = accepted.temperature;
	if (accepted.seed !== undefined) openrouter.seed = accepted.seed;

	return { openrouter };
}

/** Never absent: every request carries the compression switch, whatever it asked for. */
export function chatSettingsProviderOptions(
	model: SelectableModel,
	settings: ChatSettings
): { openrouter: Record<string, JSONValue> } {
	return providerOptionsFor(acceptSettings(model, settings));
}
