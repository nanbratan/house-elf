import { Mastra } from '@mastra/core/mastra';
import { PostgresStore } from '@mastra/pg';

import { env } from '../env';
import { generalAgent } from './agents/general';
import { chatStreamRoute } from './chat-stream-route';
import { logger } from './logger';
import { modelCatalogRoute } from './model-catalog-route';

export const mastra = new Mastra({
	agents: { general: generalAgent },
	server: {
		apiRoutes: [
			modelCatalogRoute,
			// Dynamic form: every agent registered above is reachable without a new
			// route. Reasoning and sources are on; the UI renders both.
			//
			// Our own route rather than `chatRoute`, which spreads the request body
			// into `agent.stream()`. See chat-stream-route.ts.
			chatStreamRoute
		]
	},
	storage: new PostgresStore({
		id: 'house-elf-storage',
		connectionString: env.databaseUrl
	}),
	logger
});
