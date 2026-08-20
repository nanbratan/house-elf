import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import {
	DOCUMENT_GUIDANCE,
	FACT_NAMESPACES,
	NAMESPACE_GUIDANCE,
	workingMemorySchema
} from './working-memory-schema';

/**
 * The Observer writes this document through structured output, so the only
 * guidance it ever sees is what Zod puts into the JSON Schema. Guidance that
 * lives in a TSDoc comment instead reaches nobody, which is how an earlier
 * version of this schema left the Observer guessing each namespace from its
 * name — and guessing wrong.
 */
describe('namespace guidance', () => {
	const jsonSchema = z.toJSONSchema(workingMemorySchema);
	const properties = jsonSchema.properties;

	it('carries the document-wide rules on the document itself', () => {
		expect(jsonSchema.description).toBe(DOCUMENT_GUIDANCE);
	});

	// Every required field is one more thing a Flash-class Observer can get wrong,
	// and `schemaVersion` proved it by arriving as `"goals"`.
	it('requires no bookkeeping field of its own', () => {
		expect(jsonSchema.required).toBeUndefined();
	});

	it('reaches the model as a JSON Schema description, for every namespace', () => {
		for (const namespace of Object.values(FACT_NAMESPACES)) {
			expect(properties?.[namespace]).toMatchObject({
				description: NAMESPACE_GUIDANCE[namespace]
			});
		}
	});

	// Schema writes merge: an omitted field is left alone. Telling it the write
	// replaces everything would be false, and would cost a full document per turn.
	it('never tells a merging writer that its write replaces everything', () => {
		expect(DOCUMENT_GUIDANCE).not.toContain('replaces the document');
	});

	it('gives a scheduled thing a home, so a future date is not left to guesswork', () => {
		expect(NAMESPACE_GUIDANCE.goals).toContain('has not happened yet');
	});
});
