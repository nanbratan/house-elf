import { Agent } from '@mastra/core/agent';

import { routerModelId } from '../model-router';
import { INITIAL_MODEL } from '../models';
import { getCurrentTimeTool } from '../tools/get-current-time';

/**
 * Placeholder agent for M0. It exists to prove the server, the model router and
 * Studio are wired together; it gains memory in M2.
 */
export const generalAgent = new Agent({
	id: 'general',
	name: 'General',
	// When and how to use a tool belongs in that tool's own description, next to
	// the code — not here, where it would drift. Instructions are for behaviour
	// that spans the whole agent.
	instructions: 'You are a helpful personal assistant. Answer concisely.',
	// Every request through /chat/* names its own model, and Mastra applies that
	// as a per-request override without mutating the agent — so this value is not
	// what the app runs on. It is what Studio reads to describe the agent, and
	// what Studio falls back to if its own picker sends nothing. A throwing
	// callback here makes the agent undescribable and Studio reports "Agent not
	// found", which is too high a price for a rule aimed at our own route.
	//
	// It cannot become an invisible default for the app: requireKnownModel
	// rejects an unnamed model at the door, before the agent is consulted.
	//
	// It tracks the picker's first-visit choice so the two never drift: when that
	// becomes a router in T1.7.2, Studio follows without an edit here.
	model: routerModelId(INITIAL_MODEL),
	// The key, not the tool's `id`, is the name the model calls and the name that
	// appears in the stream's `toolName`. Keep it clean.
	tools: { getCurrentTime: getCurrentTimeTool }
});
