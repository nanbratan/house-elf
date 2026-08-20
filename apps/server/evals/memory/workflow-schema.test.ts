import { describe, expect, it } from 'vitest';

import { parseStoredDocument } from './workflow-schema';

describe('parseStoredDocument', () => {
	it('parses a schema-mode document into an object', () => {
		expect(parseStoredDocument('{"constraints":{}}')).toEqual({
			constraints: {}
		});
	});

	it('leaves a template-mode document as the markdown it is', () => {
		const markdown = '# What I know about this person\n\n## Profile';

		expect(parseStoredDocument(markdown)).toBe(markdown);
	});

	// A candidate ignoring the schema is a result to score, not a run to crash.
	it('passes through text that only looks like it should be JSON', () => {
		expect(parseStoredDocument('{ not really json')).toBe('{ not really json');
	});

	it('keeps the absence of a document distinguishable', () => {
		expect(parseStoredDocument(null)).toBeNull();
	});
});
