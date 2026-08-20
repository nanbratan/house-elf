import type { Agent } from '@mastra/core/agent';
import type { MastraScorer } from '@mastra/core/evals';

import { buildEvalAgent, evalAgentId } from './agent-factory';
import { buildEvalMemory } from './memory-factory';
import { MEMORY_MODES, type MemoryMode } from './memory-modes';
import { OBSERVER_CANDIDATES, type ObserverCandidate } from './models';
import { documentScorer } from './scorers/document-scorer';
import { memoryQualityScorer } from './scorers/memory-quality-scorer';
import { buildEvalWorkflow, evalWorkflowId } from './workflow';

/** Every candidate in both modes, so the two are rows in one comparison. */
const TARGETS: readonly { candidate: ObserverCandidate; mode: MemoryMode }[] =
	OBSERVER_CANDIDATES.flatMap((candidate) =>
		Object.values(MEMORY_MODES).map((mode) => ({ candidate, mode }))
	);

/** One Agent per target — registering them is also what gives their memory a store. */
export function evalAgents(): Record<string, Agent> {
	return Object.fromEntries(
		TARGETS.map(({ candidate, mode }) => [
			evalAgentId(candidate, mode),
			buildEvalAgent(candidate, mode, buildEvalMemory(candidate, mode))
		])
	);
}

/** One Workflow per target — the thing an experiment runs against. */
export function evalWorkflows(): Record<string, ReturnType<typeof buildEvalWorkflow>> {
	return Object.fromEntries(
		TARGETS.map(({ candidate, mode }) => [
			evalWorkflowId(candidate, mode),
			buildEvalWorkflow(candidate, mode)
		])
	);
}

/**
 * Selectable when triggering an experiment. Leave `memory-document` unticked for
 * a markdown target: there is no schema to satisfy.
 */
export function evalScorers(): Record<string, MastraScorer> {
	return Object.fromEntries(
		[documentScorer(), memoryQualityScorer()].map((scorer) => [scorer.id, scorer])
	);
}
