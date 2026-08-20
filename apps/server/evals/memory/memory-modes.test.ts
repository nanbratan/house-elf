import { describe, expect, it } from 'vitest';

import { WORKING_MEMORY_TEMPLATE } from '../../src/mastra/memory/working-memory-template';
import { MEMORY_MODES, observationInstruction, renderSeedDocument } from './memory-modes';

const before = {
	document: {
		profile: {
			name: { value: 'Their name is Sam', updatedAt: '2026-08-01' },
			'squat-1rm': { value: 'Squat one-rep max is 100kg', updatedAt: '2026-08-01' }
		},
		goals: {
			'half-marathon': { value: 'Training for a half marathon', updatedAt: '2026-08-01' }
		},
		constraints: {
			vegan: { value: 'Follows a vegan diet', updatedAt: '2026-08-01', confidence: 'high' }
		}
	},
	priorDocument: '# What I know about this person\n\n## Diet\n\n- Follows a vegan diet'
};

// Record keys are schema mode's merge identity. A markdown bullet has no such
// need, and `- vegan: Vegan` is meaningless without a heading to give it
// context — which is how a seeded fact came to be dropped.
describe('renderSeedDocument', () => {
	it('hands schema mode the document as JSON', () => {
		expect(JSON.parse(renderSeedDocument(before, MEMORY_MODES.schema))).toEqual(before.document);
	});

	it('files each fact under its section heading for template mode', () => {
		const markdown = renderSeedDocument(before, MEMORY_MODES.template);

		expect(markdown).toContain('## Profile\n\n- Their name is Sam\n- Squat one-rep max is 100kg');
		expect(markdown).toContain('## Constraints\n\n- Follows a vegan diet');
		expect(markdown).toContain('## Goals\n\n- Training for a half marathon');
	});

	it('leaves a section the document says nothing about empty', () => {
		expect(renderSeedDocument(before, MEMORY_MODES.template)).toContain(
			'## Interests\n\n## Routines'
		);
	});

	// Mastra's default document is theirs; rendering a seed into a guess at its
	// shape would make the control a test of the guess.
	it('hands the control the case’s own prior document, untouched', () => {
		expect(renderSeedDocument(before, MEMORY_MODES.mastraDefault)).toBe(before.priorDocument);
	});

	// The literal and the renderer derive from each other in neither direction,
	// so this is the only thing keeping them in step.
	it('renders an empty document as the template exactly', () => {
		expect(renderSeedDocument({ document: {}, priorDocument: '' }, MEMORY_MODES.template)).toBe(
			WORKING_MEMORY_TEMPLATE
		);
	});

	it('rejects a document the schema would not accept', () => {
		expect(() =>
			renderSeedDocument(
				{ document: { constraints: 'vegan' }, priorDocument: '' },
				MEMORY_MODES.template
			)
		).toThrow();
	});
});

describe('observationInstruction', () => {
	it('tells template mode the document has sections', () => {
		expect(observationInstruction(MEMORY_MODES.template)).toContain('## Profile —');
	});

	// Instructing it would stop it being Mastra's default, which is the point of
	// having it as a control at all.
	it('leaves the control uninstructed', () => {
		expect(observationInstruction(MEMORY_MODES.mastraDefault)).toBeUndefined();
	});

	// Its JSON Schema descriptions already say all of this; repeating it here
	// would tell one mode twice what another is told once.
	it('gives schema mode nothing', () => {
		expect(observationInstruction(MEMORY_MODES.schema)).toBeUndefined();
	});
});
