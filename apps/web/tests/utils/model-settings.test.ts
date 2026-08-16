import { COST_TIERS, REASONING_EFFORTS } from '@house-elf/shared';
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
import type { StoredModelSettings } from '../../src/lib/utils/stored-model-settings.ts';

/** The panel reads capabilities once and passes them down; these tests do the same. */
function resolve(model: SelectableModel, stored: StoredModelSettings) {
	return resolveSettings(modelCapabilities(model), stored);
}

describe('resolveSettings', () => {
	it('leaves thinking off until it is asked for', () => {
		expect(resolve(thinker, {}).thinking).toBe(false);
	});

	it('reports a model that cannot be asked to stop as thinking', () => {
		// Reporting anything else would put a false statement in front of the reader.
		expect(resolve(alwaysThinks, {}).thinking).toBe(true);
	});

	it('ignores a stored thinking flag on a model that cannot think', () => {
		expect(resolve(plain, { thinking: true }).thinking).toBe(false);
	});

	it('rests on the model’s own published level, not on nothing', () => {
		// Every model that publishes levels publishes a default among them, so an
		// empty effort control would be inventing an ambiguity the catalog does not
		// have — and would read as "no effort will be made".
		const resolved = resolve(thinker, { thinking: true });

		expect(resolved.effort).toBe('low');
		expect(resolved.defaultEffort).toBe('low');
	});

	it('sends nothing while the level is the model’s own', () => {
		expect(resolve(thinker, { thinking: true }).effortSent).toBe(false);
	});

	it('sends a level the reader moved off the default', () => {
		const resolved = resolve(thinker, { thinking: true, effort: 'high' });

		expect(resolved.effort).toBe('high');
		expect(resolved.effortSent).toBe(true);
	});

	it('rests on OpenRouter’s own documented level when the model publishes none', () => {
		// The reasoning docs say `"enabled": true` reasons at `medium`, so that is
		// what an auto router already does — a real level, not an invented option.
		const resolved = resolve(router, { thinking: true });

		expect(resolved.effort).toBe('medium');
		expect(resolved.defaultEffort).toBe('medium');
		expect(resolved.effortSent).toBe(false);
	});

	it('sends a level chosen on a router that publishes none', () => {
		expect(resolve(router, { thinking: true, effort: 'low' }).effortSent).toBe(true);
	});

	it('never sends a level while thinking is off', () => {
		// A level for a model that is not thinking describes nothing.
		expect(resolve(thinker, { effort: 'high' }).effortSent).toBe(false);
	});

	it('falls back to the default for a level the model has withdrawn', () => {
		expect(resolve(thinker, { thinking: true, effort: 'xhigh' }).effort).toBe('low');
	});

	it('rests the slider on the model’s published default, and sends nothing', () => {
		const resolved = resolve(warmed, {});

		expect(resolved.temperature).toBe(0.7);
		expect(resolved.sendsTemperature).toBe(false);
	});

	it('sends a temperature that differs from the published default', () => {
		const resolved = resolve(warmed, { temperature: 1.2 });

		expect(resolved.temperature).toBe(1.2);
		expect(resolved.sendsTemperature).toBe(true);
	});

	it('treats dragging back to the published default as never having touched it', () => {
		expect(resolve(warmed, { temperature: 0.7 }).sendsTemperature).toBe(false);
	});

	it('rests at 1 and sends nothing when the model publishes no default', () => {
		const resolved = resolve(plain, {});

		expect(resolved.temperature).toBe(1);
		expect(resolved.sendsTemperature).toBe(false);
	});

	it('sends the resting value once the reader switches it on', () => {
		const resolved = resolve(plain, { temperatureOn: true });

		expect(resolved.temperature).toBe(1);
		expect(resolved.sendsTemperature).toBe(true);
	});

	it('keeps the reader’s number when they switch it back off', () => {
		// So switching it on again restores their value rather than starting over.
		const resolved = resolve(plain, { temperature: 1.6 });

		expect(resolved.temperature).toBe(1.6);
		expect(resolved.sendsTemperature).toBe(false);
	});

	it('reports no temperature at all for a model that ignores sampling', () => {
		const cold = selectableModel({ supportedParameters: [] });

		expect(resolve(cold, { temperature: 1.2 }).temperature).toBeUndefined();
	});

	it('rests the cost tier on low, which is what an unset request already does', () => {
		// The routing docs: "Requests that set no cost setting route as if you had
		// asked for roughly the `low` band."
		expect(resolve(router, {}).costTier).toBe('low');
	});

	it('never resolves to a value OpenRouter has no name for', () => {
		// Its efforts are minimal/low/medium/high/xhigh/max and its tiers are
		// low/medium/high/xhigh/max. Anything else would be vocabulary the reader
		// could go looking for in the docs and never find.
		const resolved = resolve(router, { thinking: true });

		expect(REASONING_EFFORTS).toContain(resolved.effort);
		expect(COST_TIERS).toContain(resolved.costTier);
	});
	it('falls back to a level the model offers when medium is not one of them', () => {
		// No model in today's catalog publishes levels without a default, but the
		// catalog is OpenRouter's to change — and resting on a `medium` the model
		// does not accept would break this type's own promise.
		const narrow = selectableModel({
			id: 'test/narrow',
			supportedParameters: ['reasoning', 'reasoning_effort'],
			reasoning: { mandatory: false, supportedEfforts: ['low', 'high'] }
		});

		const resolved = resolve(narrow, { thinking: true });

		expect(resolved.effort).toBe('low');
		expect(resolved.defaultEffort).toBe('low');
		expect(resolved.effortSent).toBe(false);
	});

	it('carries a tier the reader chose', () => {
		expect(resolve(router, { costTier: 'high' }).costTier).toBe('high');
	});
});
