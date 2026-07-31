import { Agent } from '@mastra/core/agent';

import { env } from '../../env';

/**
 * Placeholder agent for M0. It exists to prove the server, the model router and
 * Studio are wired together; it gains memory in M2 and tools in M1.
 */
export const generalAgent = new Agent({
	id: 'general',
	name: 'General',
	instructions: 'You are a helpful personal assistant. Answer concisely.',
	model: env.generalAgentModel
});
