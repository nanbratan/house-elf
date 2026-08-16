import type { CostTier, SelectableModel } from '@house-elf/shared';
import { COST_TIERS } from '@house-elf/shared';

import { modelCapabilities, type ModelCapabilities } from './model-capabilities.ts';

export const modelSettingsStorageKey = 'house-elf:model-settings';

/** OpenRouter's universal range; no per-model range is published anywhere. */
export const TEMPERATURE_MIN = 0;
export const TEMPERATURE_MAX = 2;

/**
 * What is kept for one model between visits.
 *
 * An absent field means "the provider decides", which is what keeps an
 * untouched control from sending anything.
 */
export interface StoredModelSettings {
	thinking?: boolean;
	effort?: string;
	temperature?: number;
	/** Only meaningful for a model that publishes no default temperature. */
	temperatureOn?: boolean;
	costTier?: CostTier;
}

/** One shared instance, so an untouched model keeps a stable identity across renders. */
export const noStoredSettings: StoredModelSettings = {};

/** Unsetting writes `undefined` rather than deleting, so emptiness means no value left. */
export function isEmptyEntry(entry: StoredModelSettings): boolean {
	return Object.values(entry).every((value) => value === undefined);
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isCostTier(value: unknown): value is CostTier {
	return typeof value === 'string' && COST_TIERS.some((tier) => tier === value);
}

function parseEntry(value: unknown): StoredModelSettings {
	if (!isRecord(value)) return {};
	const entry: StoredModelSettings = {};

	if (typeof value.thinking === 'boolean') entry.thinking = value.thinking;
	if (typeof value.effort === 'string') entry.effort = value.effort;
	if (typeof value.temperature === 'number' && Number.isFinite(value.temperature)) {
		entry.temperature = value.temperature;
	}
	if (typeof value.temperatureOn === 'boolean') entry.temperatureOn = value.temperatureOn;
	if (isCostTier(value.costTier)) entry.costTier = value.costTier;

	return entry;
}

export function parseStoredSettings(stored: string | null): Record<string, StoredModelSettings> {
	if (stored === null) return {};

	let parsed: unknown;
	try {
		parsed = JSON.parse(stored);
	} catch {
		return {};
	}

	if (!isRecord(parsed)) return {};

	const settings: Record<string, StoredModelSettings> = {};
	for (const [modelId, value] of Object.entries(parsed)) {
		settings[modelId] = parseEntry(value);
	}
	return settings;
}

function pruneEntry(
	entry: StoredModelSettings,
	capabilities: ModelCapabilities
): StoredModelSettings {
	const supported: StoredModelSettings = {};

	// A mandatory-reasoning model settles the question itself, so a stored answer
	// to it can never be read again.
	if (entry.thinking !== undefined && capabilities.canThink && !capabilities.thinkingMandatory) {
		supported.thinking = entry.thinking;
	}
	if (entry.effort !== undefined && capabilities.efforts.includes(entry.effort)) {
		supported.effort = entry.effort;
	}
	if (
		entry.temperature !== undefined &&
		capabilities.canSetTemperature &&
		entry.temperature >= TEMPERATURE_MIN &&
		entry.temperature <= TEMPERATURE_MAX
	) {
		supported.temperature = entry.temperature;
	}
	if (
		entry.temperatureOn !== undefined &&
		capabilities.canSetTemperature &&
		capabilities.defaultTemperature === undefined
	) {
		supported.temperatureOn = entry.temperatureOn;
	}
	if (entry.costTier !== undefined && capabilities.costTiers.includes(entry.costTier)) {
		supported.costTier = entry.costTier;
	}

	return supported;
}

/**
 * Re-checks every stored value against what the catalog now says.
 *
 * A live model id is not enough: a refresh can withdraw a level or a parameter
 * from a model that is still listed, and the stale value would 400.
 */
export function pruneSettings(
	settings: Record<string, StoredModelSettings>,
	models: readonly SelectableModel[]
): Record<string, StoredModelSettings> {
	const modelsById = new Map(models.map((model) => [model.id, model]));
	const stillValid: Record<string, StoredModelSettings> = {};

	for (const [modelId, entry] of Object.entries(settings)) {
		const model = modelsById.get(modelId);
		if (!model) continue;

		const prunedEntry = pruneEntry(entry, modelCapabilities(model));
		if (!isEmptyEntry(prunedEntry)) stillValid[modelId] = prunedEntry;
	}

	return stillValid;
}
