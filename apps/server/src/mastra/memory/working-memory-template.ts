import {
	DOCUMENT_GUIDANCE,
	FACT_NAMESPACES,
	NAMESPACE_GUIDANCE,
	type FactNamespace
} from './working-memory-schema';

/**
 * The document the Observer maintains, as it first sees it.
 *
 * Markdown rather than the schema next door: a JSON schema has to survive
 * whichever provider a router picks, and it does not. Gemini gets it as prompt
 * text and double-encodes the result, Azure rejects the `propertyNames` that a
 * `Record` field generates. Neither is a memory-quality problem and neither is
 * fixable from here — a template has no schema to reject.
 */
export const WORKING_MEMORY_TEMPLATE = `# What I know about this person

## Profile

## Constraints

## Interests

## Routines

## Goals

## Other`;

/** Which heading each namespace's guidance belongs to. */
export const TEMPLATE_SECTIONS: readonly { key: FactNamespace; heading: string }[] = [
	{ key: FACT_NAMESPACES.profile, heading: 'Profile' },
	{ key: FACT_NAMESPACES.constraints, heading: 'Constraints' },
	{ key: FACT_NAMESPACES.interests, heading: 'Interests' },
	{ key: FACT_NAMESPACES.routines, heading: 'Routines' },
	{ key: FACT_NAMESPACES.goals, heading: 'Goals' },
	{ key: FACT_NAMESPACES.other, heading: 'Other' }
];

/**
 * Only for the markdown modes, never for the schema.
 *
 * Schema writes merge, so an omitted field is left alone and telling it to
 * write everything again would be false — and expensive. Markdown writes
 * replace, and without this the Observer rebuilds the document around whatever
 * was just said: a two-section document came back holding one section and one
 * fact, both earlier facts gone.
 */
const REPLACEMENT_CLAUSE =
	'What you write replaces the document entirely. Everything still true has to appear in it again, in full — a fact you leave out is not kept, it is deleted.';

function sectionGuidance(bullet: string): string {
	return TEMPLATE_SECTIONS.map(
		({ key, heading }) => `${bullet}${heading} — ${NAMESPACE_GUIDANCE[key]}`
	).join('\n');
}

/**
 * What the Observer is told, appended to its system prompt.
 *
 * Kept out of the template itself: guidance living in the document would be
 * injected into context on every turn and, since an update replaces the whole
 * document, retyped on every write or lost.
 */
export function workingMemoryInstruction(): string {
	return `${DOCUMENT_GUIDANCE}\n\n${REPLACEMENT_CLAUSE}\n\nThe document has these sections:\n${sectionGuidance('## ')}`;
}
