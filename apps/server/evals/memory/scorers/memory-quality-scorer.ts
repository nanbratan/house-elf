import { createScorer, type MastraScorer } from '@mastra/core/evals';
import { z } from 'zod';

import { routerModelId } from '../../../src/mastra/model-router';
import { EVAL_JUDGE_MODEL_ID } from '../models';
import type { CaseResult } from '../workflow-schema';

/** Three-way: a question with nothing to bite on is not a question answered well. */
const aspectSchema = z.object({
	verdict: z.enum(['pass', 'fail', 'not-applicable']),
	note: z.string()
});

export const qualitySchema = z.object({
	factAdded: aspectSchema,
	nothingLost: aspectSchema,
	noInvention: aspectSchema,
	noDuplication: aspectSchema
});

export type QualityVerdict = z.infer<typeof qualitySchema>;

/** Reading order and display names; the judge's field names are for the schema. */
const ASPECTS = [
	{ key: 'factAdded', label: 'fact recorded' },
	{ key: 'nothingLost', label: 'nothing lost' },
	{ key: 'noInvention', label: 'nothing invented' },
	{ key: 'noDuplication', label: 'no duplication' }
] as const;

/**
 * The fraction of applicable aspects passed. Not-applicable leaves the
 * denominator rather than counting as a pass, so writing nothing scores 0.
 */
export function qualityScore(verdict: QualityVerdict): number {
	const applicable = ASPECTS.filter((aspect) => verdict[aspect.key].verdict !== 'not-applicable');
	if (applicable.length === 0) return 0;

	const passed = applicable.filter((aspect) => verdict[aspect.key].verdict === 'pass');

	return passed.length / applicable.length;
}

/**
 * A document that existed and is now gone.
 *
 * Total loss, and not a matter of opinion, so it is settled here rather than
 * left to the judge — which would otherwise be free to rule three of the four
 * questions not applicable and score the wipe on the one that remains.
 */
export function wasWiped(result: CaseResult): boolean {
	const had = result.before !== null && result.before !== undefined;

	return had && (result.after === null || result.after === undefined);
}

/** Names only failures: the one column Studio shows has to carry the diagnosis. */
export function qualityReason(verdict: QualityVerdict): string {
	const failures = ASPECTS.filter((aspect) => verdict[aspect.key].verdict === 'fail');
	if (failures.length === 0) return 'Nothing that applied failed.';

	return failures.map((aspect) => `${aspect.label}: ${verdict[aspect.key].note}`).join(' ');
}

/** Indented: the judge reads a nested object about as badly as a person does. */
function documentText(document: unknown, absent: string): string {
	if (document === null || document === undefined) return absent;
	if (typeof document === 'string') return document;

	return JSON.stringify(document, null, 2);
}

/**
 * The run, and deliberately not the case's `expected`.
 *
 * Handing the judge the answer turns it into a checker, and production has no
 * answer to hand it. `expected` stays ours, for checking the judge agrees.
 */
export function memoryQualityPrompt(result: CaseResult, today: string): string {
	return `Today's date is ${today}.

Working-memory document before the message:
${documentText(result.before, '(no document existed yet)')}

What the person said:
${result.input}

Working-memory document after the message:
${documentText(result.after, '(no document was written)')}

Judge the four questions below about this one exchange. Each is a pass or a
fail, or not-applicable where the question has nothing to bite on.

1. Fact recorded — does the document afterwards hold what the person just said
about themselves? The substance is what counts, under any section and in any
wording.

2. Nothing lost — did anything the document already held disappear that should
have been kept? Removing or changing something is correct where the message
corrected, replaced or withdrew it, and rewording or moving a fact is no loss
while its substance survives.

3. Nothing invented — is everything the document now asserts about the person
traceable to what they said? A consequence that follows directly is not
invention: an allergy meaning that food is avoided. Nor is a wider guess, so long
as it is marked as uncertain. It is invention when a guess is stated as flatly as
something the person actually said.

4. No duplication — is the same fact asserted in more than one place? Entries
about the same subject that say different things about it are not duplication.
Judge whether the facts are the same, not whether the words overlap.`;
}

/**
 * How well one observation cycle maintained the document.
 *
 * One call rather than one per aspect: the run is most of the prompt, so four
 * questions about it cost far less than sending it four times. Per-aspect
 * verdicts survive in `analyzeStepResult`.
 */
export function memoryQualityScorer(): MastraScorer {
	return createScorer<unknown, CaseResult>({
		id: 'memory-quality',
		description:
			'How well the document was maintained: fact recorded, nothing lost, invented or duplicated.',
		judge: {
			model: routerModelId({ id: EVAL_JUDGE_MODEL_ID }),
			instructions:
				'You review how an assistant updated its working memory after someone spoke to it. You judge substance rather than wording, you answer each question on its own evidence rather than letting one answer sway the next, and you explain every answer in one sentence.'
		}
	})
		.analyze({
			description: 'Judge the four aspects of the update',
			outputSchema: qualitySchema,
			// Without today's date the judge reads every correctly resolved
			// "last spring" as fabricated.
			createPrompt: ({ run }) =>
				memoryQualityPrompt(run.output, new Date().toISOString().slice(0, 10))
		})
		.generateScore(({ run, results }) =>
			wasWiped(run.output) ? 0 : qualityScore(results.analyzeStepResult)
		)
		.generateReason(({ run, results }) =>
			wasWiped(run.output)
				? 'The document that already existed was wiped.'
				: qualityReason(results.analyzeStepResult)
		);
}
