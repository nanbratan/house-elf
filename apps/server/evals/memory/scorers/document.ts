import {
	type WorkingMemoryDocument,
	workingMemorySchema
} from '../../../src/mastra/memory/working-memory-schema';

/**
 * `undefined` for anything the schema rejects. Takes the parsed value, so a
 * template-mode markdown document fails it — which is the right answer.
 */
export function validateDocument(document: unknown): WorkingMemoryDocument | undefined {
	const result = workingMemorySchema.safeParse(document);

	return result.success ? result.data : undefined;
}
