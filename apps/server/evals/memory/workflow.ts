import { randomUUID } from 'node:crypto';

import { createStep, createWorkflow } from '@mastra/core/workflows';

import { evalAgentId } from './agent-factory';
import { renderSeedDocument, type MemoryMode } from './memory-modes';
import { EVAL_ANSWERING_MODEL_REASONING_EFFORT, type ObserverCandidate } from './models';
import { caseResultSchema, caseSchema, parseStoredDocument } from './workflow-schema';

/**
 * A candidate's Workflow id for one memory mode — the target picked when running
 * an experiment, so switching schema for template is picking the other target
 * and the mode a finished run used is never in doubt.
 */
export function evalWorkflowId(candidate: ObserverCandidate, mode: MemoryMode): string {
	return `eval-memory-${candidate.id}-${mode}`;
}

/**
 * Runs one case against one Observer candidate: seed the starting document, say
 * the one thing the user says, and report what the document became.
 *
 * A single step, because a case is a single observation cycle. Cases never share
 * state, so the dataset can run them in any order and in parallel, and a bad
 * score points at this input rather than at something an earlier turn did.
 */
export function buildEvalWorkflow(candidate: ObserverCandidate, mode: MemoryMode) {
	const agentId = evalAgentId(candidate, mode);

	const runCaseStep = createStep({
		id: `${evalWorkflowId(candidate, mode)}-case`,
		inputSchema: caseSchema,
		outputSchema: caseResultSchema,
		execute: async ({ inputData, mastra }) => {
			const { id, before, input } = inputData;
			const agent = mastra.getAgent(agentId);
			const memory = await agent.getMemory();
			if (memory === undefined) throw new Error(`Agent ${agentId} has no memory configured.`);

			// Fresh per run, so a repeat never inherits an earlier run's document and
			// nothing collides with the app's own resource.
			const threadId = `eval-${candidate.id}-${mode}-${id}-${randomUUID()}`;
			const resourceId = threadId;

			// Thread-scoped observation reads a record that must already exist.
			await memory.createThread({ threadId, resourceId, title: id });
			if (before !== null) {
				await memory.updateWorkingMemory({
					threadId,
					resourceId,
					workingMemory: renderSeedDocument(before, mode)
				});
			}
			const seeded = await memory.getWorkingMemory({ threadId, resourceId });

			await agent.generate(input, {
				memory: { thread: threadId, resource: resourceId },
				providerOptions: {
					openrouter: { reasoning: { effort: EVAL_ANSWERING_MODEL_REASONING_EFFORT } }
				}
			});

			// Read only once `generate` has resolved: observation is awaited inside it,
			// so this is the first moment the document reflects the turn just taken.
			const after = await memory.getWorkingMemory({ threadId, resourceId });

			return {
				caseId: id,
				input,
				before: parseStoredDocument(seeded),
				after: parseStoredDocument(after)
			};
		}
	});

	return createWorkflow({
		id: evalWorkflowId(candidate, mode),
		inputSchema: caseSchema,
		outputSchema: caseResultSchema
	})
		.then(runCaseStep)
		.commit();
}
