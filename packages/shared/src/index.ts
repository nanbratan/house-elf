import { z } from 'zod';

/** Anthropic's model families, ordered most to least capable. */
export const MODEL_FAMILIES = ['opus', 'sonnet', 'haiku'] as const;

export const modelFamilySchema = z.enum(MODEL_FAMILIES);

export const selectableModelSchema = z.object({
	id: z.string().min(1),
	label: z.string().min(1),
	family: modelFamilySchema,
	generation: z.string().min(1)
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
export type SelectableModel = Readonly<z.infer<typeof selectableModelSchema>>;
export type ModelCatalog = Readonly<{
	initialModelId: string;
	models: readonly SelectableModel[];
}>;
