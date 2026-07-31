import { Agent } from '@mastra/core/agent';

import { env } from '../../env';
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
	model: env.generalAgentModel,
	// The key, not the tool's `id`, is the name the model calls and the name that
	// appears in the stream's `toolName`. Keep it clean.
	tools: { getCurrentTime: getCurrentTimeTool }
});
