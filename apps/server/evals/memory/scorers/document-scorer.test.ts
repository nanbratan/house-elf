import { describe, expect, it } from 'vitest';

import type { CaseResult } from '../workflow-schema';
import { documentScorer } from './document-scorer';

function caseResult(after: unknown): CaseResult {
	return { caseId: 'c', input: 'hello', before: null, after };
}

async function score(after: unknown): Promise<number> {
	const result = await documentScorer().run({ input: 'in', output: caseResult(after) });
	return result.score;
}

describe('documentScorer', () => {
	it('scores 1 for a document matching the schema', async () => {
		const document = {
			constraints: { 'left-knee': { value: 'ACL', updatedAt: '2026-01-01' } }
		};

		expect(await score(document)).toBe(1);
	});

	it('scores 1 for a document holding no facts yet', async () => {
		// Empty but well-formed still means the Observer ran and wrote something,
		// which is all this scorer asks.
		expect(await score({})).toBe(1);
	});

	it('scores 0 when no document was written at all', async () => {
		expect(await score(null)).toBe(0);
	});

	// What a template-mode document, or a candidate that ignored the schema, looks
	// like once the workflow has failed to parse it as JSON.
	it('scores 0 when the document is markdown or prose rather than an object', async () => {
		expect(await score('I have noted that down for you.')).toBe(0);
	});

	it('scores 0 when the document is an object but violates the schema', async () => {
		expect(await score({ constraints: 'not a record' })).toBe(0);
	});

	it('distinguishes an absent document from an invalid one in its reason', async () => {
		const absent = await documentScorer().run({ input: 'in', output: caseResult(null) });
		const invalid = await documentScorer().run({ input: 'in', output: caseResult('nope') });

		expect(absent.reason).toContain('No working-memory document');
		expect(invalid.reason).toContain('did not match');
	});
});
