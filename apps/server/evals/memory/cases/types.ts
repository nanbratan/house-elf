import type {
	FactNamespace,
	WorkingMemoryDocument
} from '../../../src/mastra/memory/working-memory-schema';

/** A fact the resulting document should hold, and where it belongs. */
export interface ExpectedFact {
	readonly namespace: FactNamespace;
	readonly description: string;
}

/**
 * A case's starting document, in the two shapes the modes need.
 *
 * `open` is written out rather than rendered from `document` because the mode
 * lets the Observer name its own sections: a document it had actually written
 * would carry sections it chose, so a seed that carries ours — or none at all —
 * is a starting state that would never occur. Section names are deliberately
 * unalike across cases, so nothing here quietly becomes a second standard.
 */
export interface CaseSeed {
	/** Schema mode reads this as JSON; template mode renders it into our headings. */
	readonly document: WorkingMemoryDocument;
	/** Open mode, as a previous run might plausibly have left it. */
	readonly priorDocument: string;
}

/**
 * One observation cycle: a known starting document, one thing the user says, and
 * what the document should hold afterwards.
 *
 * Independent by construction — a case never depends on another having run, so
 * cases execute in any order, in parallel, and a failure is attributable to this
 * input rather than to something a previous turn did.
 */
export interface EvalCase {
	readonly id: string;
	/** Seeded before the turn runs. `null` starts from no document at all. */
	readonly before: CaseSeed | null;
	readonly input: string;
	readonly expected: {
		/** Facts the document must hold once the turn is done. */
		readonly present?: readonly ExpectedFact[];
		/** Things the document must no longer assert — what a retraction removes. */
		readonly absent?: readonly string[];
	};
}
