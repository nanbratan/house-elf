import { chatRoute } from '@mastra/ai-sdk';
import { Mastra } from '@mastra/core/mastra';
import { PinoLogger } from '@mastra/loggers';
import { PostgresStore } from '@mastra/pg';

import { env } from '../env';
import { generalAgent } from './agents/general';

export const mastra = new Mastra({
	agents: { general: generalAgent },
	server: {
		apiRoutes: [
			// Dynamic form: every agent registered above is reachable without a new
			// route. Reasoning and sources are off by default; the UI renders both.
			// `version` is left at its default ('v5'). For a text-only response the
			// v5 and v6 chunk streams were verified byte-identical, so the choice is
			// deferred to T1.4 when the real @ai-sdk/svelte client can decide it.
			chatRoute({
				path: '/chat/:agentId',
				sendReasoning: true,
				sendSources: true
			})
		]
	},
	storage: new PostgresStore({
		id: 'house-elf-storage',
		connectionString: env.databaseUrl
	}),
	logger: new PinoLogger({
		name: 'house-elf',
		level: 'info'
	})
});
