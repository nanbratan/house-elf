import type { EvalCase } from './types';

/** Wraps a fact list as a document an earlier run might have written. */
function priorRun(...sections: readonly [heading: string, ...facts: string[]][]): string {
	const blocks = sections.map(([heading, ...facts]) => `## ${heading}\n\n${facts.join('\n')}`);

	return `# What I know about this person\n\n${blocks.join('\n\n')}`;
}

const vegan = {
	value: 'Follows a vegan diet',
	updatedAt: '2026-08-01',
	confidence: 'high'
} as const;
const halfMarathon = {
	value: 'Training for a half marathon in October 2026',
	updatedAt: '2026-08-01',
	confidence: 'high'
} as const;

/**
 * Every case the dataset carries. Adding one is adding it here.
 *
 * `expected` is deliberately not read by any scorer — the judge decides from
 * the run alone, as it would have to in production. It is our own label, for
 * checking later whether the judge's verdicts agree with ours.
 */
export const CASES: readonly EvalCase[] = [
	{
		id: 'new-fact',
		before: null,
		input: 'I tore the ACL in my left knee last spring, so squats are out for now.',
		expected: {
			present: [
				{ namespace: 'constraints', description: 'Tore the ACL in their left knee last spring' }
			]
		}
	},
	{
		id: 'merge-into-existing',
		before: {
			document: { constraints: { vegan } },
			priorDocument: priorRun(['Diet', '- Follows a vegan diet'])
		},
		input: "I'm training for a half marathon in October.",
		expected: {
			present: [
				{ namespace: 'constraints', description: 'Is vegan' },
				{ namespace: 'goals', description: 'Training for a half marathon in October' }
			]
		}
	},
	{
		id: 'update-value',
		before: {
			document: {
				profile: {
					'squat-1rm': {
						value: 'Squat one-rep max is 100kg',
						updatedAt: '2026-08-01',
						confidence: 'high'
					}
				}
			},
			priorDocument: priorRun(['Lifting numbers', '- Squat one-rep max is 100kg'])
		},
		input: 'Scratch that, I tested again this morning and hit 105kg on squats.',
		expected: {
			present: [{ namespace: 'profile', description: 'Squat one-rep max is 105kg' }],
			absent: ['a squat one-rep max of 100kg']
		}
	},
	{
		id: 'retraction',
		before: {
			document: {
				constraints: {
					'nut-allergy': {
						value: 'Allergic to nuts',
						updatedAt: '2026-08-01',
						confidence: 'high'
					}
				}
			},
			priorDocument: priorRun(['Allergies', '- Allergic to nuts'])
		},
		input: "Actually I mixed that up — it's my partner with the nut allergy, not me.",
		expected: { absent: ['the user themselves being allergic to nuts'] }
	},
	{
		// Thin content is where a candidate is likeliest to skip observation entirely
		// rather than record the one fact that is there.
		id: 'thin-content',
		before: null,
		input: "I'm Sam.",
		expected: { present: [{ namespace: 'profile', description: 'Their name is Sam' }] }
	},
	{
		// The weather is the distractor: an Observer that records everything it reads
		// rather than what is durable about the person will file it somewhere.
		id: 'passing-mention',
		before: null,
		input: "It's been pouring all week, miserable. Anyway, I pulled 140kg off the floor today.",
		expected: {
			present: [{ namespace: 'profile', description: 'Deadlifted 140kg' }],
			absent: ['the weather']
		}
	},
	{
		id: 'question-only',
		before: {
			document: { constraints: { vegan } },
			priorDocument: priorRun(['Food', '- Follows a vegan diet'])
		},
		input: 'What should I eat before an early morning session?',
		expected: {
			present: [{ namespace: 'constraints', description: 'Is vegan' }],
			absent: ['anything new about the person, since they stated nothing about themselves']
		}
	},
	{
		// A fact about someone else. Recording it as the user's own is the failure.
		id: 'third-party',
		before: null,
		input: 'My brother just started CrossFit and keeps trying to drag me along.',
		expected: { absent: ['the user themselves doing CrossFit'] }
	},
	{
		// Tentative, not a commitment — recording it as settled overstates what was said.
		id: 'hypothetical',
		before: null,
		input: "I've been wondering whether keto would help, might give it a go at some point.",
		expected: { absent: ['the user following a keto diet'] }
	},
	{
		id: 'several-facts-at-once',
		before: null,
		input:
			"I'm 34, I train four mornings a week before work, and I've got a bad right shoulder from years of climbing.",
		expected: {
			present: [
				{ namespace: 'profile', description: 'Is 34' },
				{ namespace: 'routines', description: 'Trains four mornings a week before work' },
				{ namespace: 'constraints', description: 'Bad right shoulder from climbing' }
			]
		}
	},
	{
		// Restates a fact already held, in different words. A second entry rather than
		// a recognised repeat is the duplication failure.
		id: 'restated-fact',
		before: {
			document: { goals: { 'half-marathon': halfMarathon } },
			priorDocument: priorRun(['Races', '- Training for a half marathon in October 2026'])
		},
		input: "Just paid the entry fee for the October half — it's official now.",
		expected: {
			present: [{ namespace: 'goals', description: 'Half marathon in October 2026' }],
			absent: ['a second, separate entry for the same half marathon']
		}
	},
	{
		id: 'unit-normalisation',
		before: null,
		input: 'I weigh about 12 stone at the moment.',
		expected: { present: [{ namespace: 'profile', description: 'Weighs about 12 stone' }] }
	},
	{
		// Needs today's date to resolve, and a wrong resolution is a real invention.
		id: 'relative-date',
		before: null,
		input: "My race is on the 14th of next month, so I'm tapering from next week.",
		expected: { present: [{ namespace: 'goals', description: 'Race on 14 September 2026' }] }
	},
	{
		id: 'equipment',
		before: null,
		input: 'Finally got a squat rack and a set of bumper plates into the garage.',
		expected: {
			present: [{ namespace: 'profile', description: 'Has a squat rack and bumper plates' }]
		}
	},
	{
		// Two facts already held, only one of them touched. Rewriting the document
		// without the untouched one is the loss this case is looking for — which
		// template mode, replacing the whole document each time, is likeliest to hit.
		id: 'partial-update',
		before: {
			document: { constraints: { vegan }, goals: { 'half-marathon': halfMarathon } },
			priorDocument: priorRun(
				['Food', '- Follows a vegan diet'],
				['Races', '- Training for a half marathon in October 2026']
			)
		},
		input: "I've dropped to two training days a week while work is busy.",
		expected: {
			present: [
				{ namespace: 'constraints', description: 'Is vegan' },
				{ namespace: 'goals', description: 'Half marathon in October 2026' },
				{ namespace: 'routines', description: 'Trains two days a week' }
			]
		}
	},

	// The five below are in domains no namespace covers. Under the schema they can
	// only land in `other`, which is what `expected` says; an open document can
	// grow a section that fits. The difference between those two outcomes is the
	// whole reason `open` exists as a mode.
	{
		id: 'medication',
		before: null,
		input: "I've been on sertraline since June, 50mg a day.",
		expected: {
			present: [{ namespace: 'other', description: 'Takes sertraline 50mg daily since June' }]
		}
	},
	{
		// Also a relative date: six months before March 2027 falls next month.
		id: 'visa-status',
		before: null,
		input: 'My work visa runs out in March 2027 and renewal has to start six months before that.',
		expected: {
			present: [
				{ namespace: 'other', description: 'Work visa expires in March 2027' },
				{ namespace: 'goals', description: 'Visa renewal to begin by September 2026' }
			]
		}
	},
	{
		id: 'mortgage',
		before: null,
		input: "My mortgage comes up for renewal in January — I'm on 4.2% at the moment.",
		expected: {
			present: [
				{ namespace: 'other', description: 'Mortgage renews in January, currently at 4.2%' }
			]
		}
	},
	{
		id: 'emergency-contact',
		before: null,
		input: 'If anything ever happens, my sister Maya in Leeds is my emergency contact.',
		expected: {
			present: [
				{ namespace: 'other', description: 'Sister Maya in Leeds is their emergency contact' }
			]
		}
	},
	{
		// A homeless fact arriving beside two that do have homes: reorganising to
		// make room for it must not cost the facts already there.
		id: 'homeless-fact-beside-existing',
		before: {
			document: { constraints: { vegan }, goals: { 'half-marathon': halfMarathon } },
			priorDocument: priorRun(
				['Eating', '- Follows a vegan diet'],
				['Endurance goals', '- Training for a half marathon in October 2026']
			)
		},
		input: "The car's MOT is due in November — it's a 2019 Golf.",
		expected: {
			present: [
				{ namespace: 'constraints', description: 'Is vegan' },
				{ namespace: 'goals', description: 'Half marathon in October 2026' },
				{ namespace: 'other', description: 'Drives a 2019 Golf with an MOT due in November' }
			]
		}
	}
];
