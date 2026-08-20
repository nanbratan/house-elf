import {
	workingMemorySchema,
	type WorkingMemoryDocument
} from '../../src/mastra/memory/working-memory-schema';
import {
	TEMPLATE_SECTIONS,
	workingMemoryInstruction,
	WORKING_MEMORY_TEMPLATE
} from '../../src/mastra/memory/working-memory-template';

/**
 * How working memory is configured for a target.
 *
 * `template` is what production ships. `mastra-default` is the control: no
 * template, no schema, no instruction, so Mastra supplies its own document and
 * its own wording. It answers whether any of ours earns its keep.
 */
export const MEMORY_MODES = {
	schema: 'schema',
	template: 'template',
	mastraDefault: 'mastra-default'
} as const;
export type MemoryMode = (typeof MEMORY_MODES)[keyof typeof MEMORY_MODES];

/**
 * The fact, not the record key. A key is schema mode's merge identity; in a
 * bulleted document it is noise at best — `- vegan: Vegan` — and meaningless
 * once a heading no longer supplies the context, as in open mode.
 */
function factLines(facts: WorkingMemoryDocument[keyof WorkingMemoryDocument]): string[] {
	return Object.values(facts ?? {}).map((fact) => `- ${fact.value}`);
}

function renderSectioned(document: WorkingMemoryDocument): string {
	const blocks = [
		'# What I know about this person',
		...TEMPLATE_SECTIONS.map(({ key, heading }) => {
			const lines = factLines(document[key]);
			if (lines.length === 0) return `## ${heading}`;

			return `## ${heading}\n\n${lines.join('\n')}`;
		})
	];

	return blocks.join('\n\n');
}

/** The half of `workingMemory` that differs by mode; the rest is shared. */
export function modeWorkingMemory(mode: MemoryMode) {
	if (mode === MEMORY_MODES.schema) return { schema: workingMemorySchema };
	// Neither key: Mastra falls back to its own default template.
	if (mode === MEMORY_MODES.mastraDefault) return {};

	return { template: WORKING_MEMORY_TEMPLATE };
}

/**
 * Only template mode is instructed here. Schema mode carries the same guidance
 * in its JSON Schema descriptions, and instructing `mastra-default` would stop
 * it being Mastra's default.
 */
export function observationInstruction(mode: MemoryMode): string | undefined {
	return mode === MEMORY_MODES.template ? workingMemoryInstruction() : undefined;
}

/**
 * A case's seeded document, in whichever shape the mode reads.
 *
 * `mastra-default` takes the case's own markdown. Mastra's default document is
 * theirs, not ours, and rendering a seed into a guess at its shape would make
 * the control a test of the guess — whereas a document some earlier run left
 * behind is a fair starting state whatever the Observer does with it next.
 *
 * For template mode an empty `document` must render to `WORKING_MEMORY_TEMPLATE`
 * exactly — its test is the only thing keeping the literal and the renderer in
 * step.
 */
export function renderSeedDocument(
	before: { document: Record<string, unknown>; priorDocument: string },
	mode: MemoryMode
): string {
	if (mode === MEMORY_MODES.mastraDefault) return before.priorDocument;
	if (mode === MEMORY_MODES.schema) return JSON.stringify(before.document);

	return renderSectioned(workingMemorySchema.parse(before.document));
}
