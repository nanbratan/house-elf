import type { OpenRouterModel } from '../../src/mastra/openrouter-catalog';

/**
 * A complete OpenRouter model, typed against the schema's own inferred shape, so
 * a field the schema gains or drops fails to compile here rather than leaving a
 * test asserting against data nobody checked.
 *
 * The defaults are the plain case: paid, text-only, no reasoning, nothing that
 * expires. A test overrides only the fields it is about, and those values are
 * then visible in the test itself instead of in a recorded response.
 */
const plainModel: OpenRouterModel = {
	id: 'test/plain-model',
	name: 'Plain Model',
	// Unix seconds, as OpenRouter states them: 2026-01-01T00:00:00Z.
	created: 1767225600,
	description: 'A model that exists to be mapped.',
	context_length: 128000,
	architecture: { input_modalities: ['text'] },
	pricing: { prompt: '0.000001', completion: '0.000002' },
	top_provider: { context_length: 128000, max_completion_tokens: 8192 },
	supported_parameters: ['temperature'],
	default_parameters: { temperature: null },
	knowledge_cutoff: null,
	expiration_date: null
};

export function openRouterModel(overrides: Partial<OpenRouterModel> = {}): OpenRouterModel {
	return { ...plainModel, ...overrides };
}
