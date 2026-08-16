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

import { parseStoredSettings, pruneSettings } from '../../src/lib/utils/stored-model-settings.ts';

describe('parseStoredSettings', () => {
	it('reads nothing stored as no settings', () => {
		expect(parseStoredSettings(null)).toEqual({});
	});

	it('treats unparseable JSON as no settings', () => {
		expect(parseStoredSettings('not json at all')).toEqual({});
	});

	it('treats a stored value that is not an object as no settings', () => {
		expect(parseStoredSettings('["a list"]')).toEqual({});
	});

	it('keeps each field that is the type it should be', () => {
		const stored = JSON.stringify({
			'test/thinker': { thinking: true, effort: 'low', temperature: 0.4, costTier: 'medium' }
		});

		expect(parseStoredSettings(stored)).toEqual({
			'test/thinker': { thinking: true, effort: 'low', temperature: 0.4, costTier: 'medium' }
		});
	});

	it('drops a field of the wrong type rather than carrying it to the server', () => {
		const stored = JSON.stringify({
			'test/thinker': { thinking: 'yes', effort: 3, temperature: 'hot', costTier: 'enormous' }
		});

		expect(parseStoredSettings(stored)).toEqual({ 'test/thinker': {} });
	});

	it('drops a temperature that is not a finite number', () => {
		const stored = '{"test/plain":{"temperature":null}}';

		expect(parseStoredSettings(stored)).toEqual({ 'test/plain': {} });
	});
});

describe('pruneSettings', () => {
	const catalog = [plain, thinker, alwaysThinks, router, warmed];

	it('keeps what the model still takes', () => {
		const stored = { 'test/thinker': { thinking: true, effort: 'low' } };

		expect(pruneSettings(stored, catalog)).toEqual(stored);
	});

	it('drops settings for a model the catalog no longer carries', () => {
		const settings = pruneSettings(
			{ 'test/retired': { thinking: true }, 'test/thinker': { thinking: true } },
			catalog
		);

		expect(settings).toEqual({ 'test/thinker': { thinking: true } });
	});

	it('drops an effort level a still-listed model has withdrawn', () => {
		// Checking the id still exists is not enough: a catalog refresh can take a
		// level away from a model that is otherwise unchanged, and the stale value
		// would reach the server and 400.
		const settings = pruneSettings(
			{ 'test/thinker': { thinking: true, effort: 'xhigh' } },
			catalog
		);

		expect(settings).toEqual({ 'test/thinker': { thinking: true } });
	});

	it('drops a temperature from a model that no longer samples', () => {
		const cooled = selectableModel({ id: 'test/plain', supportedParameters: [] });

		const settings = pruneSettings({ 'test/plain': { temperature: 0.4 } }, [cooled]);

		expect(settings).toEqual({});
	});

	it('drops a temperature outside the range the schema allows', () => {
		const settings = pruneSettings({ 'test/plain': { temperature: 4 } }, catalog);

		expect(settings).toEqual({});
	});

	it('drops a cost tier from a model that does not route by cost', () => {
		const settings = pruneSettings({ 'test/plain': { costTier: 'low' } }, catalog);

		expect(settings).toEqual({});
	});

	it('keeps a cost tier on a router that does', () => {
		const settings = pruneSettings({ 'openrouter/auto': { costTier: 'low' } }, catalog);

		expect(settings).toEqual({ 'openrouter/auto': { costTier: 'low' } });
	});

	it('drops a stored thinking answer for a model that now always thinks', () => {
		// Not merely stale: the answer can never be read again.
		const settings = pruneSettings({ 'test/always': { thinking: false } }, catalog);

		expect(settings).toEqual({});
	});

	it('drops the temperature switch for a model that publishes a default', () => {
		// The switch only exists for models with no default to rest on.
		const settings = pruneSettings({ 'test/warmed': { temperatureOn: true } }, catalog);

		expect(settings).toEqual({});
	});

	it('removes an entry left with nothing in it', () => {
		expect(pruneSettings({ 'test/plain': {} }, catalog)).toEqual({});
	});
});
