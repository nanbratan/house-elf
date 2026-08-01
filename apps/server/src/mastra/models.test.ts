import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
	MODEL_FAMILIES,
	SELECTABLE_MODELS,
	UnknownModelError,
	findModel,
	resolveModel
} from './models.ts';

describe('the model allowlist', () => {
	it('resolves a known id to its entry', () => {
		expect(resolveModel('anthropic/claude-opus-4-8')).toMatchObject({
			id: 'anthropic/claude-opus-4-8',
			family: 'opus',
			generation: '4.8'
		});
	});

	it('rejects an id it does not offer', () => {
		expect(() => resolveModel('anthropic/claude-opus-4-1')).toThrow(UnknownModelError);
	});

	it('rejects a near miss rather than resolving it loosely', () => {
		// Casing, whitespace and the bare model name are all different strings.
		expect(() => resolveModel('Anthropic/Claude-Opus-5')).toThrow(UnknownModelError);
		expect(() => resolveModel(' anthropic/claude-opus-5 ')).toThrow(UnknownModelError);
		expect(() => resolveModel('claude-opus-5')).toThrow(UnknownModelError);
	});

	it('rejects a value that is not a string, by type rather than by echoing it', () => {
		expect(() => resolveModel(42)).toThrow(UnknownModelError);
		expect(() => resolveModel({ id: 'anthropic/claude-opus-5' })).toThrow(
			/^Model a object is not in the allowlist\./
		);
	});

	it('rejects a request that names nothing, rather than picking one', () => {
		// There is no server-side default. Omitting the field is a client bug, and
		// spending money on a model nobody asked for is the wrong way to report it.
		expect(() => resolveModel(undefined)).toThrow(UnknownModelError);
		expect(() => resolveModel(null)).toThrow(/^No model was named, and there is no default\./);
	});

	it('lists every option it would have accepted, so a rejection is actionable', () => {
		const message = new UnknownModelError(undefined).message;
		for (const model of SELECTABLE_MODELS) expect(message).toContain(model.id);
	});

	it('does not echo an unbounded client string back into the message', () => {
		const reject = () => resolveModel('x'.repeat(5000));
		expect(reject).toThrow(`"${'x'.repeat(80)}"`);
		expect(reject).not.toThrow('x'.repeat(81));
	});

	it('looks up without throwing', () => {
		expect(findModel('anthropic/claude-sonnet-5')?.label).toBe('Sonnet 5');
		expect(findModel('anthropic/nope')).toBeUndefined();
	});

	it('offers each id exactly once, in a known family, with a label', () => {
		const ids = SELECTABLE_MODELS.map((model) => model.id);
		expect(new Set(ids).size).toBe(ids.length);
		for (const model of SELECTABLE_MODELS) {
			expect(MODEL_FAMILIES).toContain(model.family);
			expect(model.label.length).toBeGreaterThan(0);
			expect(model.generation.length).toBeGreaterThan(0);
		}
	});

	it('offers only ids the installed provider registry actually has', () => {
		// The one rule of this milestone that cannot be checked by reading: every
		// id has to exist upstream. Read from the registry @mastra/core ships,
		// which is the same file the provider-registry script reads.
		const require = createRequire(import.meta.url);
		const registryPath = join(
			dirname(require.resolve('@mastra/core/package.json')),
			'dist',
			'provider-registry.json'
		);
		const registry = JSON.parse(readFileSync(registryPath, 'utf-8')) as {
			providers: Record<string, { models: string[]; deprecatedModels?: string[] }>;
		};

		for (const model of SELECTABLE_MODELS) {
			const [providerName, ...rest] = model.id.split('/');
			const modelName = rest.join('/');
			const provider = registry.providers[providerName ?? ''];

			expect(provider, `unknown provider in ${model.id}`).toBeDefined();
			expect(provider?.models, `unknown model ${model.id}`).toContain(modelName);
			expect(provider?.deprecatedModels ?? [], `deprecated model ${model.id}`).not.toContain(
				modelName
			);
		}
	});
});
