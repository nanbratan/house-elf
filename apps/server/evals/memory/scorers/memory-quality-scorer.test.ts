import { describe, expect, it } from 'vitest';

import { CASES } from '../cases';
import type { CaseResult } from '../workflow-schema';
import {
	memoryQualityPrompt,
	qualityReason,
	qualityScore,
	wasWiped,
	type QualityVerdict
} from './memory-quality-scorer';

/**
 * The judge itself is not exercised here — it calls a model, which unit tests
 * never do. What matters and is testable is what it is shown, since the whole
 * design turns on it being shown the run and not the answer.
 */

const result: CaseResult = {
	caseId: 'retraction',
	input: "Actually it's my partner with the nut allergy, not me.",
	before: { constraints: { 'nut-allergy': { value: 'Allergic' } } },
	after: { constraints: {} }
};

const TODAY = '2026-08-20';

describe('memoryQualityPrompt', () => {
	it('shows the document before, what was said, and the document after', () => {
		const prompt = memoryQualityPrompt(result, TODAY);

		expect(prompt).toContain('nut-allergy');
		expect(prompt).toContain("Actually it's my partner");
		expect(prompt).toContain('"constraints": {}');
	});

	// Studio and the judge both read a nested object badly as one escaped line.
	it('renders a schema-mode document as indented JSON', () => {
		expect(memoryQualityPrompt(result, TODAY)).toContain('{\n  "constraints"');
	});

	it('shows a template-mode document as the markdown it is', () => {
		const markdown = '# What I know about this person\n\n## Profile\n\n- name: Sam';

		expect(memoryQualityPrompt({ ...result, after: markdown }, TODAY)).toContain(markdown);
	});

	it('says so plainly when there was no document to begin with', () => {
		expect(memoryQualityPrompt({ ...result, before: null }, TODAY)).toContain(
			'no document existed yet'
		);
	});

	it('says so plainly when nothing was written', () => {
		expect(memoryQualityPrompt({ ...result, after: null }, TODAY)).toContain(
			'no document was written'
		);
	});

	it('asks about all four aspects', () => {
		const prompt = memoryQualityPrompt(result, TODAY);

		expect(prompt).toContain('Fact recorded');
		expect(prompt).toContain('Nothing lost');
		expect(prompt).toContain('Nothing invented');
		expect(prompt).toContain('No duplication');
	});

	it('tells the judge that a withdrawn fact is not a loss', () => {
		expect(memoryQualityPrompt(result, TODAY)).toContain('withdrew it');
	});

	// The one thing the judge cannot work out from the run. Without it, a
	// correctly resolved "last spring" is indistinguishable from a fabricated
	// date, and it marks every one of them as invention.
	it("tells the judge today's date", () => {
		expect(memoryQualityPrompt(result, TODAY)).toContain(TODAY);
	});
});

const allCorrect: QualityVerdict = {
	factAdded: { verdict: 'pass', note: 'The ACL tear is recorded under injuries.' },
	nothingLost: { verdict: 'pass', note: 'Nothing was removed.' },
	noInvention: { verdict: 'pass', note: 'Every entry traces to the message.' },
	noDuplication: { verdict: 'pass', note: 'Each fact appears once.' }
};

describe('qualityScore', () => {
	it('is 1 when every aspect passed', () => {
		expect(qualityScore(allCorrect)).toBe(1);
	});

	it('is 0 when every aspect failed', () => {
		expect(
			qualityScore({
				factAdded: { verdict: 'fail', note: 'a' },
				nothingLost: { verdict: 'fail', note: 'b' },
				noInvention: { verdict: 'fail', note: 'c' },
				noDuplication: { verdict: 'fail', note: 'd' }
			})
		).toBe(0);
	});

	it('drops by a quarter for a single failed aspect', () => {
		expect(
			qualityScore({
				...allCorrect,
				nothingLost: { verdict: 'fail', note: 'The vegan entry vanished.' }
			})
		).toBe(0.75);
	});

	// The candidate that writes nothing at all: three questions have nothing to
	// bite on, and awarding them as passes scored it 0.75 for doing no work.
	it('is 0 when the only applicable aspect failed', () => {
		expect(
			qualityScore({
				factAdded: { verdict: 'fail', note: 'No document was written.' },
				nothingLost: { verdict: 'not-applicable', note: 'There was no document.' },
				noInvention: { verdict: 'not-applicable', note: 'Nothing was written.' },
				noDuplication: { verdict: 'not-applicable', note: 'Nothing was written.' }
			})
		).toBe(0);
	});

	it('scores over the aspects that applied, not over all four', () => {
		expect(
			qualityScore({
				...allCorrect,
				noInvention: { verdict: 'fail', note: 'It guessed a training frequency.' },
				noDuplication: { verdict: 'not-applicable', note: 'Only one fact is recorded.' }
			})
		).toBe(2 / 3);
	});

	it('is 0 when nothing applied, rather than a free pass', () => {
		expect(
			qualityScore({
				factAdded: { verdict: 'not-applicable', note: 'a' },
				nothingLost: { verdict: 'not-applicable', note: 'b' },
				noInvention: { verdict: 'not-applicable', note: 'c' },
				noDuplication: { verdict: 'not-applicable', note: 'd' }
			})
		).toBe(0);
	});
});

describe('qualityReason', () => {
	it('says so plainly when nothing failed', () => {
		expect(qualityReason(allCorrect)).toBe('Nothing that applied failed.');
	});

	it('leaves a not-applicable aspect out of the reason', () => {
		const reason = qualityReason({
			...allCorrect,
			nothingLost: { verdict: 'not-applicable', note: 'There was no document.' }
		});

		expect(reason).toBe('Nothing that applied failed.');
	});

	it('names the failed aspect and quotes the judge on it', () => {
		const reason = qualityReason({
			...allCorrect,
			nothingLost: { verdict: 'fail', note: 'The vegan entry vanished.' }
		});

		expect(reason).toBe('nothing lost: The vegan entry vanished.');
	});

	it('leaves passing aspects out of the reason', () => {
		const reason = qualityReason({
			...allCorrect,
			noDuplication: { verdict: 'fail', note: 'The half marathon is filed twice.' }
		});

		expect(reason).not.toContain('fact recorded');
		expect(reason).toContain('no duplication');
	});

	it('lists every failure when more than one aspect failed', () => {
		const reason = qualityReason({
			...allCorrect,
			factAdded: { verdict: 'fail', note: 'The ACL tear is missing.' },
			noInvention: { verdict: 'fail', note: 'It guessed a training frequency.' }
		});

		expect(reason).toContain('fact recorded: The ACL tear is missing.');
		expect(reason).toContain('nothing invented: It guessed a training frequency.');
	});
});

describe('blindness', () => {
	// The judge must decide correctness from the run alone. Leaking a case's
	// `expected` would turn it into a checker and hide whether it can actually do
	// the job in production, where nothing tells it what to expect.
	const expectations = CASES.flatMap((evalCase) => [
		...(evalCase.expected.present ?? []).map((fact) => fact.description),
		...(evalCase.expected.absent ?? [])
	]);

	it('has expectations available to leak, so this test can bite', () => {
		expect(expectations.length).toBeGreaterThan(0);
	});

	it('never puts an expectation in the prompt', () => {
		const prompt = memoryQualityPrompt(result, TODAY);

		for (const expectation of expectations) {
			expect(prompt).not.toContain(expectation);
		}
	});
});

describe('wasWiped', () => {
	const document = { profile: { name: { value: 'Sam', updatedAt: '2026-08-01' } } };

	it('is a wipe when a document that existed is gone', () => {
		expect(wasWiped({ ...result, before: document, after: null })).toBe(true);
	});

	// Writing nothing when there was nothing is a failure to record, which
	// `factAdded` already catches. It is not a loss.
	it('is not a wipe when there was no document to begin with', () => {
		expect(wasWiped({ ...result, before: null, after: null })).toBe(false);
	});

	it('is not a wipe when the document was merely emptied of facts', () => {
		expect(wasWiped({ ...result, before: document, after: {} })).toBe(false);
	});
});
