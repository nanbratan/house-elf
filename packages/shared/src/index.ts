import { z } from 'zod';

/** Anthropic's model families, ordered most to least capable. */
export const MODEL_FAMILIES = ['opus', 'sonnet', 'haiku'] as const;

export const modelFamilySchema = z.enum(MODEL_FAMILIES);

/**
 * Whether a model can be asked to think, and whether it can be asked not to.
 *
 * - `optional` — thinking is a per-request choice. The picker shows a toggle.
 * - `always` — the model thinks on every request and rejects being told not to.
 *   No toggle is shown, because there is nothing to decide.
 * - `unsupported` — the model cannot think. No toggle, and asking for thinking
 *   is a 400.
 *
 * This describes a capability, never a setting. Nothing here says whether
 * thinking is switched on right now; that travels per message in the request.
 */
export const THINKING_SUPPORT = ['optional', 'always', 'unsupported'] as const;

export const thinkingSupportSchema = z.enum(THINKING_SUPPORT);

export const selectableModelSchema = z.object({
	id: z.string().min(1),
	label: z.string().min(1),
	family: modelFamilySchema,
	generation: z.string().min(1),
	thinking: thinkingSupportSchema
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

export type ModelFamily = z.infer<typeof modelFamilySchema>;
export type ThinkingSupport = z.infer<typeof thinkingSupportSchema>;
export type SelectableModel = Readonly<z.infer<typeof selectableModelSchema>>;
export type ModelCatalog = Readonly<{
	initialModelId: string;
	models: readonly SelectableModel[];
}>;
