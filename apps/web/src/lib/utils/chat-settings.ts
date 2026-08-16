import type { ChatSettings } from '@house-elf/shared';
import { REASONING_MODE } from '@house-elf/shared';

import { OPENROUTER_DEFAULT_COST_TIER, type ResolvedSettings } from './model-settings.ts';

/**
 * The object one request carries.
 *
 * `reasoning` is always sent: models of the Claude 5 class think unless told
 * not to. Everything else is sent only when it differs from the default.
 */
export function chatSettingsFor(modelId: string, resolved: ResolvedSettings): ChatSettings {
	return {
		model: modelId,
		reasoning: resolved.thinking
			? { mode: REASONING_MODE.on, ...(resolved.effortSent && { effort: resolved.effort }) }
			: { mode: REASONING_MODE.off },
		...(resolved.sendsTemperature &&
			resolved.temperature !== undefined && { temperature: resolved.temperature }),
		...(resolved.costTier !== OPENROUTER_DEFAULT_COST_TIER && { costTier: resolved.costTier })
	};
}
