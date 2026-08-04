import { beforeEach, describe, expect, it, vi } from 'vitest';

import { openRouterModel } from '../../tests/helpers/openrouter-model.ts';

/**
 * The catalog is stubbed: fetching, caching and expiry are its own module's
 * behaviour and are covered in `openrouter-catalog.test.ts`. What is left here
 * is the mapping from OpenRouter's shape to the app's, and what a request may
 * name.
 */
const { catalogStub } = vi.hoisted(() => ({
	catalogStub: { list: vi.fn(), get: vi.fn() }
}));

vi.mock('./openrouter-catalog', () => ({ openRouterCatalog: catalogStub }));

const { INITIAL_MODEL_ID, modelCatalog, resolveModel, selectableModels, UnknownModelError } =
	await import('./models.ts');

beforeEach(() => {
	vi.clearAllMocks();
	catalogStub.list.mockResolvedValue([]);
	catalogStub.get.mockResolvedValue(undefined);
});

/** The one model the stubbed catalog offers, mapped. */
async function mapped(model: Parameters<typeof openRouterModel>[0]) {
	catalogStub.list.mockResolvedValue([openRouterModel(model)]);
	const models = await selectableModels();
	const only = models[0];
	if (only === undefined) throw new Error('the mapping dropped the only model there was');
	return only;
}

describe('the mapped catalog', () => {
	it('maps every field the picker and the request path read', async () => {
		const model = await mapped({
			id: 'anthropic/claude-opus-5',
			name: 'Claude Opus 5',
			created: 1767225600,
			description: 'Anthropic’s flagship.',
			context_length: 1000000,
			architecture: { input_modalities: ['text', 'image', 'file'] },
			pricing: { prompt: '0.000005', completion: '0.000025' },
			top_provider: { context_length: 1000000, max_completion_tokens: 128000 },
			supported_parameters: ['temperature', 'reasoning'],
			default_parameters: { temperature: 0.7 },
			knowledge_cutoff: '2025-03-31',
			reasoning: {
				mandatory: false,
				supported_efforts: ['high', 'medium'],
				default_effort: 'high',
				default_enabled: true,
				supports_max_tokens: true
			}
		});

		// Strict, so a mapping line dropped for a field that is undefined in some
		// other case is a failure here and not a match.
		expect(model).toStrictEqual({
			id: 'anthropic/claude-opus-5',
			label: 'Claude Opus 5',
			provider: 'anthropic',
			description: 'Anthropic’s flagship.',
			// Seconds in, milliseconds out.
			createdAt: 1767225600000,
			contextLength: 1000000,
			maxCompletionTokens: 128000,
			knowledgeCutoff: '2025-03-31',
			inputModalities: ['text', 'image', 'file'],
			supportedParameters: ['temperature', 'reasoning'],
			pricing: { prompt: '0.000005', completion: '0.000025' },
			defaultParameters: { temperature: 0.7 },
			isFree: false,
			isRouter: false,
			reasoning: {
				mandatory: false,
				supportedEfforts: ['high', 'medium'],
				defaultEffort: 'high',
				defaultEnabled: true,
				supportsMaxTokens: true
			}
		});
	});

	it('leaves what OpenRouter states as null absent instead', async () => {
		// OpenRouter says "not published" with null; the app's schema accepts only
		// absence, so every nullable field has to be translated.
		const model = await mapped({
			knowledge_cutoff: null,
			default_parameters: { temperature: null },
			top_provider: { context_length: null, max_completion_tokens: null }
		});

		expect(model.knowledgeCutoff).toBeUndefined();
		expect(model.defaultParameters).toStrictEqual({ temperature: undefined });
		expect(model.maxCompletionTokens).toBeUndefined();
	});

	it('reads the provider slug past the ~ of a latest pointer', async () => {
		// `~anthropic/…` is the id verbatim; `~anthropic` is not a provider.
		const model = await mapped({ id: '~anthropic/claude-opus-latest' });

		expect(model.id).toBe('~anthropic/claude-opus-latest');
		expect(model.provider).toBe('anthropic');
	});

	it('calls a model free only when both halves cost nothing', async () => {
		const free = await mapped({ pricing: { prompt: '0', completion: '0' } });
		const halfFree = await mapped({ pricing: { prompt: '0', completion: '0.000002' } });

		expect(free.isFree).toBe(true);
		expect(halfFree.isFree).toBe(false);
	});

	it('does not call a router free, though it prices below zero', async () => {
		// The routers price as "-1" — whatever the model they pick costs. A
		// non-positive check would put every one of them under a Free filter.
		const router = await mapped({
			id: 'openrouter/auto',
			pricing: { prompt: '-1', completion: '-1' }
		});

		expect(router.isFree).toBe(false);
		expect(router.isRouter).toBe(true);
	});

	it('leaves reasoning absent for a model that takes the parameter but describes none', async () => {
		// `openrouter/auto` is this shape live, so the thinking gate reads
		// `supportedParameters` rather than the presence of this object.
		const model = await mapped({ supported_parameters: ['temperature', 'reasoning'] });

		expect(model.reasoning).toBeUndefined();
		expect(model.supportedParameters).toContain('reasoning');
	});

	it('keeps a reasoning object that carries nothing but mandatory', async () => {
		// Most models that reason are exactly this: the flag and nothing else.
		const model = await mapped({ reasoning: { mandatory: true } });

		expect(model.reasoning).toStrictEqual({
			mandatory: true,
			supportedEfforts: undefined,
			defaultEffort: undefined,
			defaultEnabled: undefined,
			supportsMaxTokens: undefined
		});
	});

	it('maps every model the catalog offers, not just the first', async () => {
		catalogStub.list.mockResolvedValue([
			openRouterModel({ id: 'a/one' }),
			openRouterModel({ id: 'b/two' })
		]);

		const models = await selectableModels();

		expect(models.map((model) => model.id)).toStrictEqual(['a/one', 'b/two']);
	});
});

describe('resolveModel', () => {
	it('maps the model the catalog answers with', async () => {
		catalogStub.get.mockResolvedValue(openRouterModel({ id: 'qwen/qwen3', name: 'Qwen 3' }));

		await expect(resolveModel('qwen/qwen3')).resolves.toMatchObject({
			id: 'qwen/qwen3',
			label: 'Qwen 3',
			provider: 'qwen'
		});
	});

	it('asks the catalog for the id as it arrived, without tidying it up', async () => {
		// Casing and whitespace are not ours to forgive: a request either names an
		// id the catalog carries or it is rejected.
		await expect(resolveModel(' Anthropic/Claude-Opus-5 ')).rejects.toBeInstanceOf(
			UnknownModelError
		);

		expect(catalogStub.get).toHaveBeenCalledWith(' Anthropic/Claude-Opus-5 ');
	});

	it('rejects an id the catalog does not offer', async () => {
		await expect(resolveModel('anthropic/claude-opus-4-1')).rejects.toBeInstanceOf(
			UnknownModelError
		);
	});

	it('rejects a value that is not a string, by type rather than by echoing it', async () => {
		await expect(resolveModel(42)).rejects.toThrow(/^Model a number is not in the catalog\./);
		expect(catalogStub.get).not.toHaveBeenCalled();
	});

	it('rejects a request that names nothing, rather than picking one', async () => {
		// There is no server-side default. Omitting the field is a client bug, and
		// spending money on a model nobody asked for is the wrong way to report it.
		await expect(resolveModel(undefined)).rejects.toThrow(
			/^No model was named, and there is no default\./
		);
		expect(catalogStub.get).not.toHaveBeenCalled();
	});

	it('does not echo an unbounded client string back into the message', async () => {
		const rejection = resolveModel('x'.repeat(5000));

		await expect(rejection).rejects.toThrow(`"${'x'.repeat(80)}"`);
		await expect(rejection).rejects.not.toThrow('x'.repeat(81));
	});

	it('does not enumerate the catalog into the message', () => {
		// The catalog runs to hundreds of ids; listing them would put a paragraph
		// of noise in front of a reader who mistyped one.
		expect(new UnknownModelError('anthropic/nope').message.length).toBeLessThan(200);
	});
});

describe('modelCatalog', () => {
	it('offers the initial model it names', async () => {
		catalogStub.list.mockResolvedValue([
			openRouterModel({ id: INITIAL_MODEL_ID }),
			openRouterModel({ id: 'anthropic/claude-opus-5' })
		]);

		const catalog = await modelCatalog();

		expect(catalog.initialModelId).toBe('openrouter/auto');
		expect(catalog.models.map((model) => model.id)).toContain(INITIAL_MODEL_ID);
	});

	it('satisfies the schema the browser parses it with', async () => {
		const { modelCatalogSchema } = await import('@house-elf/shared');
		catalogStub.list.mockResolvedValue([openRouterModel({ id: INITIAL_MODEL_ID })]);

		const catalog = await modelCatalog();

		expect(() => modelCatalogSchema.parse(catalog)).not.toThrow();
	});
});
