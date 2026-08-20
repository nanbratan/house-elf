import { z } from 'zod';

/** Flat on purpose: structured-output reliability drops with schema depth. */
const factSchema = z.object({
	value: z.string(),
	updatedAt: z.string(),
	confidence: z.enum(['low', 'med', 'high']).optional(),
	source: z.string().optional()
});

/**
 * Kinds of statement, not topics. A fact has several topics but one kind, so
 * topic namespaces file the same fact in two places at once.
 *
 * A const object rather than an array so the schema below references each value
 * instead of restating it, making a rename a compile error.
 */
export const FACT_NAMESPACES = {
	profile: 'profile',
	constraints: 'constraints',
	interests: 'interests',
	routines: 'routines',
	goals: 'goals',
	other: 'other'
} as const;
export type FactNamespace = (typeof FACT_NAMESPACES)[keyof typeof FACT_NAMESPACES];

/** `Record`, never an array: schema writes merge key by key, arrays replace wholesale. */
const namespaceFacts = z.record(z.string(), factSchema).optional();

/**
 * What each namespace is for, and which wins where two compete.
 *
 * Zod emits these as JSON Schema `description`, so the Observer reads them. A
 * TSDoc comment would reach nobody.
 */
export const NAMESPACE_GUIDANCE = {
	profile:
		'Stable attributes of the person and their situation: their name, where they live, what they own, what units they use, and where they currently stand on anything measured.',
	constraints:
		'What is ruled in or out for this person, and why — a food they avoid, a movement they cannot do.',
	interests: 'What they care about or enjoy.',
	routines:
		'What they habitually do. A one-off is not a routine unless they described it as a habit.',
	goals: 'What they are working toward, including anything scheduled that has not happened yet.',
	other: 'Durable facts about the person that fit none of the above.'
} as const;

/** Rules spanning the whole document, on the object itself so the Observer reads them too. */
export const DOCUMENT_GUIDANCE =
	'Each entry records only what its own section is for. Where a fact relates to one already recorded, refer to it rather than writing it out a second time. Mark anything you inferred rather than heard as uncertain — in the confidence field where the document has one, in the wording where it does not — and state plainly only what the person actually said.';

/**
 * The document the agent keeps about its reader.
 *
 * Nothing required and no scalar fields: every required field is one more thing
 * a Flash-class Observer can get wrong on every write.
 */
export const workingMemorySchema = z
	.object({
		[FACT_NAMESPACES.profile]: namespaceFacts.describe(NAMESPACE_GUIDANCE.profile),
		[FACT_NAMESPACES.constraints]: namespaceFacts.describe(NAMESPACE_GUIDANCE.constraints),
		[FACT_NAMESPACES.interests]: namespaceFacts.describe(NAMESPACE_GUIDANCE.interests),
		[FACT_NAMESPACES.routines]: namespaceFacts.describe(NAMESPACE_GUIDANCE.routines),
		[FACT_NAMESPACES.goals]: namespaceFacts.describe(NAMESPACE_GUIDANCE.goals),
		[FACT_NAMESPACES.other]: namespaceFacts.describe(NAMESPACE_GUIDANCE.other)
	})
	.describe(DOCUMENT_GUIDANCE);

export type WorkingMemoryDocument = z.infer<typeof workingMemorySchema>;
