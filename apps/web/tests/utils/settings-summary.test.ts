import type { SelectableModel } from '@house-elf/shared';
import { describe, expect, it } from 'vitest';

import {
	effortThinking,
	mandatoryThinking,
	routerThinking,
	selectableModel
} from '../helpers/models.ts';

const plain = selectableModel({ id: 'test/plain' });
const thinker = selectableModel({ id: 'test/thinker', ...effortThinking });
const alwaysThinks = selectableModel({ id: 'test/always', ...mandatoryThinking });
const router = selectableModel({ id: 'openrouter/auto', isRouter: true, ...routerThinking });
const warmed = selectableModel({ id: 'test/warmed', defaultParameters: { temperature: 0.7 } });

import { modelCapabilities } from '../../src/lib/utils/model-capabilities.ts';
import { resolveSettings } from '../../src/lib/utils/model-settings.ts';
import { settingsSummary } from '../../src/lib/utils/settings-summary.ts';
import type { StoredModelSettings } from '../../src/lib/utils/stored-model-settings.ts';

/** The trigger is handed the same capabilities and resolution the panel used. */
function summarise(model: SelectableModel, stored: StoredModelSettings) {
	const capabilities = modelCapabilities(model);
	return settingsSummary(capabilities, resolveSettings(capabilities, stored));
}

describe('settingsSummary', () => {
	it('says only the word when nothing is set', () => {
		expect(summarise(thinker, {})).toEqual({ tokens: [], label: 'Settings' });
	});

	it('names the level in use even when it is the model’s own default', () => {
		// The trigger is there to say what the next message will do, and `Thinking
		// on` hides the difference between minimal and max — the two ends of what
		// it will cost.
		expect(summarise(thinker, { thinking: true }).tokens).toEqual(['Low effort']);
	});

	it('names the documented level a router rests on', () => {
		expect(summarise(router, { thinking: true }).tokens).toEqual([
			'Medium effort',
			'Low cost tier'
		]);
	});

	it('falls back to naming thinking for a model that takes no level at all', () => {
		const levelless = selectableModel({ id: 'test/levelless', supportedParameters: ['reasoning'] });

		expect(summarise(levelless, { thinking: true }).tokens).toEqual(['Thinking on']);
	});

	it('names the unit, not just the value, so a level is never ambiguous', () => {
		// `REASONING_EFFORTS` and `COST_TIERS` share their level words and a router
		// can carry one of each, so `Thinking medium · Cost medium` would leave the
		// reader guessing what medium measures.
		const summary = summarise(router, {
			thinking: true,
			effort: 'high',
			costTier: 'high'
		});

		expect(summary.tokens).toEqual(['High effort', 'High cost tier']);
	});

	it('lets the level stand for thinking, rather than naming both', () => {
		expect(summarise(router, { thinking: true, effort: 'high' }).tokens).toEqual([
			'High effort',
			'Low cost tier'
		]);
	});

	it('counts a setting it has no room to name', () => {
		const summary = summarise(router, {
			thinking: true,
			effort: 'low',
			costTier: 'high',
			temperature: 1.4,
			temperatureOn: true
		});

		expect(summary.tokens).toEqual(['Low effort', 'High cost tier', '+1']);
	});

	it('names a lone shaping setting rather than reducing it to a count', () => {
		// `+1` on its own tells the reader something changed but not what, which is
		// strictly worse than the name it stood in for.
		const summary = summarise(plain, { temperature: 1.4, temperatureOn: true });

		expect(summary.tokens).toEqual(['Temp 1.4']);
	});

	it('spells the full list out uncapped for a screen reader', () => {
		const summary = summarise(router, {
			thinking: true,
			effort: 'low',
			costTier: 'high',
			temperature: 1.4,
			temperatureOn: true
		});

		expect(summary.label).toBe(
			'Settings: thinking on at low effort, cost tier high, temperature 1.4'
		);
	});

	it('names a mandatory thinker as thinking, though nothing was stored', () => {
		expect(summarise(alwaysThinks, {}).tokens).toEqual(['Thinking on']);
	});

	it('does not count a temperature resting on the default', () => {
		expect(summarise(warmed, { temperature: 0.7 }).tokens).toEqual([]);
	});

	it('names the tier in force even when it is the documented default', () => {
		// A router always routes by some band; going quiet exactly when it rests on
		// the cheapest models is the trigger hiding what it exists to report.
		expect(summarise(router, {}).tokens).toEqual(['Low cost tier']);
	});

	it('names no tier for a model that does not route by cost', () => {
		expect(summarise(thinker, {}).tokens).toEqual([]);
	});
});
