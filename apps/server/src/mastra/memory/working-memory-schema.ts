import { z } from 'zod';

/**
 * One thing the assistant knows about, with everything it knows about it.
 *
 * Organised by subject rather than by kind. Sections named for kinds — profile,
 * constraints, interests, goals — cut across the subjects facts actually arrive
 * in: a marathon is a goal, an interest and, once a knee gives out, a
 * constraint, so it gets shredded across four of them and the shared detail
 * written out in each. A subject holds its own facets, so there is nothing to
 * cut across and nothing to restate.
 */
const topic = z.object({
	name: z
		.string()
		.describe('What this is about, in a word or two — "Marathon", "Passport", "Mortgage".'),
	summary: z
		.string()
		.describe('The topic in one sentence, enough on its own for someone who reads nothing else.'),
	details: z
		.array(z.string())
		.optional()
		.describe(
			'What the summary leaves out, one sentence each — how it stands now, what it depends on, what changed. Where this touches another topic, say so here rather than repeating it there.'
		)
});

/**
 * The document the agent keeps about its reader.
 *
 * An array, not a record keyed by name: given a key and a value a model fills
 * both with the same sentence. Nothing is required of the document itself —
 * which facts about a person turn out to matter is not knowable in advance, so
 * resist adding fields it must fill.
 */
export const workingMemorySchema = z
	.object({
		topics: z.array(topic).optional()
	})
	.describe(
		'Keep one topic per subject and fold new facts into the topic they belong to, rather than opening a second one for the same subject. Write every sentence so it reads on its own.'
	);

export type WorkingMemoryDocument = z.infer<typeof workingMemorySchema>;
