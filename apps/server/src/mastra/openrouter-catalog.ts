import { z } from 'zod';

import { env } from '../env';

/**
 * The account-scoped list, so the API key is required to read it. It is the
 * public `/models` minus what this account's privacy settings exclude, which is
 * why no client-side privacy filtering exists: change a setting on the website
 * and the picker follows without a deploy.
 */
const CATALOG_URL = 'https://openrouter.ai/api/v1/models/user';

/**
 * Refetching 337 models per chat request is wasteful for a list that changes a
 * few times a week. There is deliberately no persisted snapshot: OpenRouter
 * serves this endpoint through Cloudflare with `stale-if-error=3600`, so the
 * likely failure — an origin outage — is already absorbed at the edge.
 */
const CACHE_TTL_MS = 60 * 60 * 1000;

/**
 * Turns prose into OpenRouter API request objects rather than answering a
 * question, so it does not speak the messages-in/text-out shape at all. The
 * other five `openrouter/*` entries are real routing products and are offered.
 */
const EXCLUDED_ROUTER_ID = 'openrouter/bodybuilder';

/**
 * Only `mandatory` is universal — verified against all 213 live entries carrying a
 * `reasoning` object on 2026-08-03. `supported_efforts` is never null: an absent
 * key means a plain on/off, not "any effort accepted".
 */
const reasoningSchema = z.object({
	mandatory: z.boolean(),
	default_enabled: z.boolean().optional(),
	supported_efforts: z.array(z.string()).optional(),
	default_effort: z.string().optional(),
	supports_max_tokens: z.boolean().optional()
});

/**
 * Deliberately narrow: unknown keys are stripped, so nothing travels further
 * than the fields the app has a use for. Every `nullable` here was counted
 * across all 337 live entries on 2026-08-03, not guessed — notably
 * `default_parameters.temperature`, which is null on 162 of the 233 that carry
 * it, so it can display a published default and can never supply one.
 */
const openRouterModelSchema = z.object({
	id: z.string().min(1),
	name: z.string().min(1),
	// Unix seconds. The picker groups by release month.
	created: z.number(),
	description: z.string(),
	context_length: z.number(),
	architecture: z.object({
		input_modalities: z.array(z.string())
	}),
	// Only `prompt` and `completion` are on every entry; the rest of the pricing
	// keys are genuinely sparse and none is needed yet.
	pricing: z.object({
		prompt: z.string(),
		completion: z.string()
	}),
	top_provider: z.object({
		context_length: z.number().nullable(),
		max_completion_tokens: z.number().nullable()
	}),
	supported_parameters: z.array(z.string()),
	default_parameters: z.object({
		temperature: z.number().nullish()
	}),
	knowledge_cutoff: z.string().nullable(),
	expiration_date: z.string().nullable(),
	reasoning: reasoningSchema.optional(),
	// Absent from `/models/user`, present on the public list's 11 `~…-latest`
	// entries. Kept so the schema fits both; nothing may be built on reading it.
	alias_target: z.object({ slug: z.string() }).optional()
});

const catalogResponseSchema = z.object({
	data: z.array(openRouterModelSchema).min(1)
});

export type OpenRouterModel = Readonly<z.infer<typeof openRouterModelSchema>>;

/** Thrown when the catalog has never been fetched and cannot be fetched now. */
export class CatalogUnavailableError extends Error {
	constructor(cause: unknown) {
		super('The OpenRouter model catalog could not be fetched and nothing was cached.', { cause });
		this.name = 'CatalogUnavailableError';
	}
}

let cache: { models: readonly OpenRouterModel[]; fetchedAt: number } | undefined;

async function fetchModels(): Promise<readonly OpenRouterModel[]> {
	const response = await fetch(CATALOG_URL, {
		headers: { Authorization: `Bearer ${env.openrouterApiKey}` }
	});
	if (!response.ok) {
		throw new Error(`OpenRouter answered ${String(response.status)} for the model catalog.`);
	}
	return catalogResponseSchema.parse(await response.json()).data;
}

function isOffered(model: OpenRouterModel, now: number): boolean {
	if (model.id === EXCLUDED_ROUTER_ID) return false;
	// An unparseable date parses to NaN and every NaN comparison is false, so a
	// malformed field keeps the model rather than silently removing something usable.
	const hasExpired = model.expiration_date !== null && Date.parse(model.expiration_date) < now;
	return !hasExpired;
}

/**
 * Expiry is applied on read rather than baked into the cache, so a model that
 * lapses mid-TTL disappears at the right moment instead of an hour late.
 *
 * A failed refresh with something already cached serves the stale list: model
 * metadata going briefly out of date must never stop a message being sent
 * against a model the client already holds.
 */
export async function openRouterModels(): Promise<readonly OpenRouterModel[]> {
	const now = Date.now();

	if (cache === undefined || now - cache.fetchedAt >= CACHE_TTL_MS) {
		try {
			cache = { models: await fetchModels(), fetchedAt: now };
		} catch (error) {
			if (cache === undefined) throw new CatalogUnavailableError(error);
			// Stale beats empty. Nothing consumes this module yet, so there is no
			// logger to report the failed refresh to; T1.7.2 wires one in.
		}
	}

	return cache.models.filter((model) => isOffered(model, now));
}
