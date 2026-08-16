import type { ModelCapabilities } from './model-capabilities.ts';
import type { ResolvedSettings } from './model-settings.ts';

export interface SettingsSummary {
	/** What the trigger shows. Settings past the first two collapse into a `+n`. */
	readonly tokens: readonly string[];
	/** Every setting spelled out and uncapped, for the trigger's accessible name. */
	readonly label: string;
}

function capitalise(word: string): string {
	return word.charAt(0).toUpperCase() + word.slice(1);
}

/**
 * What the composer's settings trigger says.
 *
 * Tokens name the unit, not just the value: efforts and cost tiers share their
 * level words and a router can carry one of each, so a bare pair would read
 * `Medium · Medium`.
 */
export function settingsSummary(
	capabilities: ModelCapabilities,
	resolved: ResolvedSettings
): SettingsSummary {
	const alwaysShownTokens: string[] = [];
	const overflowTokens: string[] = [];
	const labelParts: string[] = [];

	if (resolved.thinking) {
		if (capabilities.efforts.length === 0) {
			alwaysShownTokens.push('Thinking on');
			labelParts.push('thinking on');
		} else {
			// The level implies thinking is on, so naming both would be redundant.
			alwaysShownTokens.push(`${capitalise(resolved.effort)} effort`);
			labelParts.push(`thinking on at ${resolved.effort} effort`);
		}
	}

	if (capabilities.costTiers.length > 0) {
		alwaysShownTokens.push(`${capitalise(resolved.costTier)} cost tier`);
		labelParts.push(`cost tier ${resolved.costTier}`);
	}

	if (resolved.sendsTemperature && resolved.temperature !== undefined) {
		overflowTokens.push(`Temp ${String(resolved.temperature)}`);
		labelParts.push(`temperature ${String(resolved.temperature)}`);
	}

	const tokens = [...alwaysShownTokens];
	// A lone `+1` would say something changed without saying what.
	if (overflowTokens.length > 0) {
		if (tokens.length === 0) tokens.push(...overflowTokens);
		else tokens.push(`+${String(overflowTokens.length)}`);
	}

	return {
		tokens,
		label: labelParts.length === 0 ? 'Settings' : `Settings: ${labelParts.join(', ')}`
	};
}
