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

export const REASONING_MODE = { on: 'on', off: 'off' } as const;

export type ReasoningMode = (typeof REASONING_MODE)[keyof typeof REASONING_MODE];

/**
 * A union rather than `{ enabled, effort? }`, so `{ off, effort }` is a parse
 * error rather than a rule someone has to remember.
 *
 * `effort` is optional when on, and absent means the provider's own level. Most
 * models that reason publish no `supportedEfforts`, so that is the only way they
 * can be asked to think at all.
 */
export const chatReasoningSchema = z.discriminatedUnion('mode', [
	z.strictObject({ mode: z.literal(REASONING_MODE.off) }),
	z.strictObject({
		mode: z.literal(REASONING_MODE.on),
		/** Validated against the selected model's own list, so no enum here. */
		effort: z.string().min(1).optional()
	})
]);

export type ChatReasoning = Readonly<z.infer<typeof chatReasoningSchema>>;

/**
 * The effort levels a request may name, least to most.
 *
 * OpenRouter also defines `none`, left out because it disables reasoning, which
 * `mode: 'off'` already says. Includes `max`, which OpenRouter's parameter
 * reference omits and many live models publish.
 */
export const REASONING_EFFORTS = ['minimal', 'low', 'medium', 'high', 'xhigh', 'max'] as const;

export type ReasoningEffort = (typeof REASONING_EFFORTS)[number];

/** OpenRouter's spelling of "do not reason", which this contract spells `mode: 'off'`. */
export const EFFORT_MEANING_OFF = 'none';

/** Router cost bands, cheapest to most capable. */
export const COST_TIERS = ['low', 'medium', 'high', 'xhigh', 'max'] as const;

export type CostTier = (typeof COST_TIERS)[number];

/**
 * The models a cost tier may be sent to.
 *
 * A literal list rather than `SelectableModel.isRouter`, which is a prefix test
 * on `openrouter/` and so is true for `openrouter/free` — a router with no
 * documented cost-tier plugin id. Sending it one is a 400.
 *
 * It lives here because both halves have to agree: the server refuses a tier on
 * anything else, so a picker that offered the control on a wider set would show
 * a control whose only effect is an error.
 */
export const COST_TIER_MODEL_IDS = ['openrouter/auto', 'openrouter/auto-beta'] as const;

export type CostTierModelId = (typeof COST_TIER_MODEL_IDS)[number];

export function supportsCostTier(modelId: string): modelId is CostTierModelId {
	return COST_TIER_MODEL_IDS.some((id) => id === modelId);
}

/**
 * What the browser is allowed to decide about a single request.
 *
 * The client names intent; the server decides what it costs in the provider's
 * own spelling. An absent field means the parameter is not sent at all, so no
 * value is ever invented here.
 *
 * `reasoning` is required because models of the Claude 5 class think unless told
 * not to, so omitting it hands them a default the reader never chose.
 *
 * Strict at both levels, so a setting this server does not understand is a 400
 * rather than a silent no-op: the user can see the control they moved.
 */
export const chatSettingsSchema = z.strictObject({
	/** A catalog id, not a provider id — the server maps it to the router. */
	model: z.string().min(1),
	reasoning: chatReasoningSchema,
	/** OpenRouter's universal range; no per-model range is published anywhere. */
	temperature: z.number().min(0).max(2).optional(),
	seed: z.int().optional(),
	/** Routers only — the server rejects it on anything else. */
	costTier: z.enum(COST_TIERS).optional()
});

export type ChatSettings = Readonly<z.infer<typeof chatSettingsSchema>>;
