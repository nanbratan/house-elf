import { z } from 'zod';

/**
 * What a model will do if asked to think.
 *
 * Only `mandatory` is universal; the other fields are absent on most models that
 * carry this object at all, so the shape mirrors OpenRouter's rather than
 * flattening it into states the live data cannot express. An absent
 * `supportedEfforts` means a plain on/off, not "any effort accepted".
 *
 * This describes a capability, never a setting. Nothing here says whether
 * thinking is switched on right now; that travels per message in the request.
 */
export const reasoningSupportSchema = z.object({
	/** True when the model thinks whatever it is told, and rejects being told not to. */
	mandatory: z.boolean(),
	supportedEfforts: z.array(z.string()).optional(),
	defaultEffort: z.string().optional(),
	defaultEnabled: z.boolean().optional(),
	supportsMaxTokens: z.boolean().optional()
});

/** Dollars per token, as OpenRouter states them: decimal strings, not numbers. */
export const modelPricingSchema = z.object({
	prompt: z.string(),
	completion: z.string()
});

/** Published defaults, for display. A model with none rests on the provider's. */
export const modelDefaultParametersSchema = z.object({
	temperature: z.number().optional()
});

export const selectableModelSchema = z.object({
	id: z.string().min(1),
	label: z.string().min(1),
	/** The id's slug before the first `/`. Not an enum — there are 52 and it moves. */
	provider: z.string().min(1),
	description: z.string(),
	/** Unix milliseconds, so the picker can group by release month. */
	createdAt: z.number(),
	contextLength: z.number(),
	maxCompletionTokens: z.number().optional(),
	knowledgeCutoff: z.string().optional(),
	inputModalities: z.array(z.string()),
	/** OpenRouter's own list. The gate for every per-model control. */
	supportedParameters: z.array(z.string()),
	pricing: modelPricingSchema,
	defaultParameters: modelDefaultParametersSchema,
	/**
	 * Derived, because the routers price as `"-1"` — meaning "whatever the model
	 * it picks costs" — and a non-positive check would call all of them free.
	 */
	isFree: z.boolean(),
	/** OpenRouter's own routing products, which pick a model per request. */
	isRouter: z.boolean(),
	reasoning: reasoningSupportSchema.optional()
});

/** Public shape returned by the Mastra model-catalog route. */
export const modelCatalogSchema = z
	.object({
		initialModelId: z.string().min(1),
		models: z.array(selectableModelSchema).min(1)
	})
	.refine((catalog) => catalog.models.some((model) => model.id === catalog.initialModelId), {
		message: 'The initial model must be present in the catalog',
		path: ['initialModelId']
	});

export type ReasoningSupport = Readonly<z.infer<typeof reasoningSupportSchema>>;
export type ModelPricing = Readonly<z.infer<typeof modelPricingSchema>>;
export type SelectableModel = Readonly<z.infer<typeof selectableModelSchema>>;
export type ModelCatalog = Readonly<{
	initialModelId: string;
	models: readonly SelectableModel[];
}>;

/**
 * What the browser is allowed to decide about a single request.
 *
 * The client names intent, never provider parameters: `thinking` is a boolean
 * because what thinking costs — an effort level, a token budget, a provider's
 * spelling of either — is the server's to say. When the user should choose an
 * effort level, that becomes its own validated field with its own server-side
 * mapping, not a raw provider blob.
 *
 * One nested object rather than top-level fields, so there is one thing to
 * validate as it grows.
 *
 * Strict, so a setting this server does not understand is a 400 rather than a
 * silent no-op: the user can see the control they moved.
 */
export const chatSettingsSchema = z.strictObject({
	/** A catalog id, not a provider id — the server maps it to the router. */
	model: z.string().min(1),
	thinking: z.boolean()
});

export type ChatSettings = Readonly<z.infer<typeof chatSettingsSchema>>;
