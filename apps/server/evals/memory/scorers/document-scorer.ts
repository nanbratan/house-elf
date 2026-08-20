import { createScorer, type MastraScorer } from '@mastra/core/evals';

import type { CaseResult } from '../workflow-schema';
import { validateDocument } from './document';

/**
 * Did the case leave behind a usable working-memory document?
 *
 * The whole question for now, deliberately: a candidate that emits nothing, or
 * emits something the schema rejects, fails here however good its extraction
 * would otherwise be. That is the failure this suite exists to catch — it is
 * what disqualified a candidate by hand before.
 *
 * Whether the document holds the *right* facts is a separate scorer, added
 * alongside this one rather than folded into it. The dataset's own average
 * across cases is what turns these 0/1 results into a rate per candidate.
 */
export function documentScorer(): MastraScorer {
	return createScorer<unknown, CaseResult>({
		id: 'memory-document',
		description: 'The case produced a working-memory document that matches the schema.'
	})
		.generateScore(({ run }) => (validateDocument(run.output.after) === undefined ? 0 : 1))
		.generateReason(({ run }) => {
			const { after } = run.output;
			if (after === null) return 'No working-memory document was written.';

			return validateDocument(after) === undefined
				? 'The document did not match the working-memory schema.'
				: 'A schema-valid document was written.';
		});
}
