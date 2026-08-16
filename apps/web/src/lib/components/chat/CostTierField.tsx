import type { CostTier } from '@house-elf/shared';

import { OPENROUTER_DEFAULT_COST_TIER } from '../../utils/model-settings.ts';
import { Field } from '../ui/field.tsx';
import { LevelSlider } from './LevelSlider.tsx';
import { ScaleCaptions } from './ScaleCaptions.tsx';
import { SettingHeader } from './SettingHeader.tsx';

export interface CostTierFieldProps {
	tiers: readonly CostTier[];
	value: CostTier;
	onChange: (tier: CostTier) => void;
}

/**
 * One description for both auto routers: the routing docs say "a tier is a band,
 * not a ceiling, so models cheaper than the band are excluded as well as models
 * above it", and neither router departs from that.
 */
const TIER_HINT =
	'The price band the router picks from. It is a band, not a spending limit — models cheaper than the band are ruled out as well as pricier ones. Low is what a request with no tier already does.';

export function CostTierField({ tiers, value, onChange }: CostTierFieldProps) {
	function handleReset() {
		onChange(OPENROUTER_DEFAULT_COST_TIER);
	}

	// Narrows the slider's `string` back to the tier it came from.
	function handleChange(level: string) {
		const tier = tiers.find((candidate) => candidate === level);
		if (tier !== undefined) onChange(tier);
	}

	return (
		<Field>
			<SettingHeader
				label="Cost tier"
				value={value}
				hint={TIER_HINT}
				onReset={handleReset}
				showReset={value !== OPENROUTER_DEFAULT_COST_TIER}
			/>
			<ScaleCaptions minLabel="Cheaper" maxLabel="More capable" />
			<LevelSlider label="Cost tier" levels={tiers} value={value} onChange={handleChange} />
		</Field>
	);
}
