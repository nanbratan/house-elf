import { describe, expect, it } from 'vitest';

import {
	effortThinking,
	mandatoryThinking,
	optionalThinking,
	selectableModel,
	undescribedThinking
} from '../helpers/models.ts';

import { hasSettings, modelCapabilities } from '../../src/lib/utils/model-capabilities.ts';

describe('thinking', () => {
	it('reads the parameter list, not the reasoning object', () => {
		// The two disagree on the live catalog, and the parameter list is the one
		// that says what the model accepts being asked.
		const model = selectableModel({ supportedParameters: [], reasoning: { mandatory: false } });

		expect(modelCapabilities(model).canThink).toBe(false);
	});

	it('marks a model that cannot be asked to stop', () => {
		expect(modelCapabilities(selectableModel(mandatoryThinking)).thinkingMandatory).toBe(true);
	});

	it('is not mandatory when the model does not advertise reasoning at all', () => {
		// Guards the `canThink &&` short-circuit: the parameter list is the
		// authority, so a stray `reasoning.mandatory` cannot force thinking on for
		// a model that cannot be asked to think.
		const model = selectableModel({ supportedParameters: [], reasoning: { mandatory: true } });

		expect(modelCapabilities(model).thinkingMandatory).toBe(false);
	});

	it('does not mark one that can', () => {
		expect(modelCapabilities(selectableModel(optionalThinking)).thinkingMandatory).toBe(false);
	});
});

describe('effort levels', () => {
	it('are empty when the model takes no effort level, even though it thinks', () => {
		expect(modelCapabilities(selectableModel(optionalThinking)).efforts).toEqual([]);
	});

	it('carry the model’s own published default, which is always one of them', () => {
		// True for all 72 models in the live catalog that publish levels at all, so
		// the control never has to open on a blank.
		const capabilities = modelCapabilities(selectableModel(effortThinking));

		expect(capabilities.defaultEffort).toBe('low');
		expect(capabilities.efforts).toContain(capabilities.defaultEffort);
	});

	it('report no default for a model that publishes none — the two auto routers', () => {
		const model = selectableModel({
			...undescribedThinking,
			supportedParameters: ['reasoning', 'reasoning_effort']
		});

		expect(modelCapabilities(model).defaultEffort).toBeUndefined();
	});

	it('refuse a published default of none, which means not reasoning at all', () => {
		// `openai/gpt-5.1` ships this. It is filtered out of the levels, so it
		// could not be shown as selected either.
		const model = selectableModel({
			supportedParameters: ['reasoning', 'reasoning_effort'],
			reasoning: { mandatory: false, supportedEfforts: ['none', 'low'], defaultEffort: 'none' }
		});

		expect(modelCapabilities(model).defaultEffort).toBeUndefined();
	});

	it('refuse a published default that is not among the levels', () => {
		const model = selectableModel({
			supportedParameters: ['reasoning', 'reasoning_effort'],
			reasoning: { mandatory: false, supportedEfforts: ['low'], defaultEffort: 'high' }
		});

		expect(modelCapabilities(model).defaultEffort).toBeUndefined();
	});

	it('are the model’s own list, ordered least to most', () => {
		// An unordered row of levels reads as unrelated options rather than a dial.
		expect(modelCapabilities(selectableModel(effortThinking)).efforts).toEqual(['low', 'high']);
	});

	it('drop the level that means no reasoning', () => {
		// The thinking switch already says that, and the server refuses it as an
		// effort — offering it would be a control whose only effect is a 400.
		expect(modelCapabilities(selectableModel(effortThinking)).efforts).not.toContain('none');
	});

	it('fall back to OpenRouter’s own for a model that takes the parameter and publishes none', () => {
		const model = selectableModel({
			...undescribedThinking,
			supportedParameters: ['reasoning', 'reasoning_effort']
		});

		expect(modelCapabilities(model).efforts).toEqual([
			'minimal',
			'low',
			'medium',
			'high',
			'xhigh',
			'max'
		]);
	});

	it('keep a level the shared list does not name, after the ones it does', () => {
		// The catalog is OpenRouter's to extend; a level this app has not heard of
		// is still one the server will accept.
		const model = selectableModel({
			supportedParameters: ['reasoning', 'reasoning_effort'],
			reasoning: { mandatory: false, supportedEfforts: ['ultra', 'low'] }
		});

		expect(modelCapabilities(model).efforts).toEqual(['low', 'ultra']);
	});
});

describe('temperature', () => {
	it('is offered when the model advertises it', () => {
		expect(modelCapabilities(selectableModel()).canSetTemperature).toBe(true);
	});

	it('is not offered when it does not', () => {
		const capabilities = modelCapabilities(selectableModel({ supportedParameters: [] }));

		expect(capabilities.canSetTemperature).toBe(false);
		expect(capabilities.defaultTemperature).toBeUndefined();
	});

	it('carries the model’s published default when there is one', () => {
		const model = selectableModel({ defaultParameters: { temperature: 0.7 } });

		expect(modelCapabilities(model).defaultTemperature).toBe(0.7);
	});

	it('reports no default when the model publishes none', () => {
		expect(modelCapabilities(selectableModel()).defaultTemperature).toBeUndefined();
	});
});

describe('cost tiers', () => {
	it('are offered on the two routers that route by cost', () => {
		expect(modelCapabilities(selectableModel({ id: 'openrouter/auto' })).costTiers).toEqual([
			'low',
			'medium',
			'high',
			'xhigh',
			'max'
		]);
		expect(
			modelCapabilities(selectableModel({ id: 'openrouter/auto-beta' })).costTiers.length
		).toBeGreaterThan(0);
	});

	it('are not offered on a router without a documented plugin id', () => {
		// `isRouter` is a prefix test, so it is true here — and the server 400s a
		// tier on anything but the two auto routers.
		const free = selectableModel({ id: 'openrouter/free', isRouter: true });

		expect(free.isRouter).toBe(true);
		expect(modelCapabilities(free).costTiers).toEqual([]);
	});

	it('are not offered on an ordinary model', () => {
		expect(modelCapabilities(selectableModel()).costTiers).toEqual([]);
	});
});

describe('hasSettings', () => {
	it('is false for a model with nothing the panel can act on', () => {
		const model = selectableModel({ supportedParameters: [] });

		expect(hasSettings(modelCapabilities(model))).toBe(false);
	});

	it('is true when only temperature is available', () => {
		expect(hasSettings(modelCapabilities(selectableModel()))).toBe(true);
	});

	it('is true when only thinking is available', () => {
		const model = selectableModel({ supportedParameters: ['reasoning'] });

		expect(hasSettings(modelCapabilities(model))).toBe(true);
	});

	it('is true when only a cost tier is available', () => {
		const model = selectableModel({ id: 'openrouter/auto', supportedParameters: [] });

		expect(hasSettings(modelCapabilities(model))).toBe(true);
	});
});
