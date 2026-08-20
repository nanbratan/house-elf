import { describe, expect, it } from 'vitest';

import { DOCUMENT_GUIDANCE, FACT_NAMESPACES, NAMESPACE_GUIDANCE } from './working-memory-schema';
import { workingMemoryInstruction, WORKING_MEMORY_TEMPLATE } from './working-memory-template';

describe('WORKING_MEMORY_TEMPLATE', () => {
	it('offers a heading for every namespace the schema has', () => {
		for (const namespace of Object.values(FACT_NAMESPACES)) {
			const heading = `${namespace.charAt(0).toUpperCase()}${namespace.slice(1)}`;

			expect(WORKING_MEMORY_TEMPLATE).toContain(`## ${heading}`);
		}
	});

	// Guidance inside the document is injected into context every turn and,
	// because an update replaces the whole document, retyped on every write.
	it('holds no guidance, which belongs in the Observer instruction', () => {
		expect(WORKING_MEMORY_TEMPLATE).not.toContain(DOCUMENT_GUIDANCE);
		expect(WORKING_MEMORY_TEMPLATE).not.toContain(NAMESPACE_GUIDANCE.profile);
	});
});

describe('instructions', () => {
	it('carries the document rules and every section rule', () => {
		const instruction = workingMemoryInstruction();

		expect(instruction).toContain(DOCUMENT_GUIDANCE);
		for (const namespace of Object.values(FACT_NAMESPACES)) {
			expect(instruction).toContain(NAMESPACE_GUIDANCE[namespace]);
		}
	});

	// An Observer rebuilt a two-section document around the message it had just
	// read, losing both facts already in it. Schema mode must never be told this:
	// its writes merge, so an omitted field is left alone.
	it('warns that the write replaces the whole document', () => {
		expect(workingMemoryInstruction()).toContain('replaces the document entirely');
	});

	it('states the sections as the document’s own', () => {
		expect(workingMemoryInstruction()).toContain('## Profile —');
	});
});
