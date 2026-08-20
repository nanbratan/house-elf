import { z } from 'zod';

const expectedFactSchema = z.object({
	namespace: z.string(),
	description: z.string()
});

/** A dataset item's `input`: one case, exactly as authored in TypeScript. */
export const caseSchema = z.object({
	id: z.string(),
	before: z
		.object({
			document: z.record(z.string(), z.unknown()),
			priorDocument: z.string()
		})
		.nullable(),
	input: z.string(),
	expected: z.object({
		present: z.array(expectedFactSchema).optional(),
		absent: z.array(z.string()).optional()
	})
});

/**
 * Unvalidated on purpose: whether the document satisfies the schema is what
 * `memory-document` measures, so rejecting one here turns a finding into a crash.
 */
const storedDocumentSchema = z.unknown();

/**
 * Parsed so a schema-mode run reads as an object in Studio, not one escaped line.
 *
 * Cannot branch on the mode: a schema-mode candidate writing non-JSON is a result
 * to score, so the raw text has to pass through.
 */
export function parseStoredDocument(raw: string | null): unknown {
	if (raw === null) return null;

	try {
		return JSON.parse(raw);
	} catch {
		return raw;
	}
}

/**
 * What running one case produced. Carries the starting document alongside the
 * resulting one, so a scorer can tell a fact that was never recorded from one
 * that was correctly removed.
 */
export const caseResultSchema = z.object({
	caseId: z.string(),
	input: z.string(),
	before: storedDocumentSchema,
	after: storedDocumentSchema
});
export type CaseResult = z.infer<typeof caseResultSchema>;
