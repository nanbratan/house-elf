/**
 * Mirrors the TypeScript cases into a Mastra Dataset, so experiments can be run
 * and compared from Studio. Cases stay authored in TypeScript; this only copies
 * them into storage.
 *
 * Re-running replaces the dataset outright, which also discards any experiments
 * recorded against it. That is the right trade while the cases are still
 * changing; it is worth revisiting once runs are worth keeping.
 */
import { CASES } from './cases';
import { mastra } from '../../src/mastra';

const DATASET_ID = 'memory-evals';

await mastra.datasets.delete({ id: DATASET_ID }).catch(() => undefined);

const dataset = await mastra.datasets.create({
	id: DATASET_ID,
	name: 'Working-memory evals',
	description: 'One observation cycle per item, for comparing Observer models.'
});

await dataset.addItems({
	items: CASES.map((evalCase) => ({
		externalId: evalCase.id,
		input: evalCase,
		groundTruth: evalCase.expected
	}))
});

console.info(`Seeded ${String(CASES.length)} cases into dataset "${DATASET_ID}":`);
for (const evalCase of CASES) {
	console.info(`  ${evalCase.id}${evalCase.before === null ? '' : ' (seeded state)'}`);
}
process.exit(0);
