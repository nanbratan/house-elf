import type { SelectableModel } from '@house-elf/shared';

/**
 * A catalog entry with every field filled in, so a test states only the ones it
 * is about. The values are shaped like OpenRouter's — the id carries its
 * provider slug, prices are decimal strings — but they are stand-ins: what the
 * real response contains is the server's business, and is asserted there.
 */
export function selectableModel(overrides: Partial<SelectableModel> = {}): SelectableModel {
	const id = overrides.id ?? 'test/model';

	return {
		id,
		label: 'Test Model',
		provider: id.split('/')[0] ?? id,
		description: 'A model that exists for the duration of one test.',
		createdAt: Date.UTC(2026, 0, 1),
		contextLength: 200000,
		inputModalities: ['text'],
		supportedParameters: ['temperature'],
		pricing: { prompt: '0.000001', completion: '0.000002' },
		defaultParameters: {},
		isFree: false,
		isRouter: false,
		...overrides
	};
}

/**
 * Thinking is the reader's to choose. Spread into an override, because the
 * capability lives in `supportedParameters` and only the details live in
 * `reasoning` — the live catalog has models with one and not the other.
 */
export const optionalThinking = {
	supportedParameters: ['temperature', 'reasoning'],
	reasoning: { mandatory: false }
} as const satisfies Partial<SelectableModel>;

/**
 * Takes the parameter but describes no reasoning — the shape `openrouter/auto`
 * has, and the model a first visit starts on.
 */
export const undescribedThinking = {
	supportedParameters: ['temperature', 'reasoning']
} as const satisfies Partial<SelectableModel>;

/** The model thinks whatever it is told, so there is nothing to decide. */
export const mandatoryThinking = {
	supportedParameters: ['temperature', 'reasoning'],
	reasoning: { mandatory: true }
} as const satisfies Partial<SelectableModel>;
