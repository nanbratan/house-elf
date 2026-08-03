import { chatRoute } from '@mastra/ai-sdk';
import { Mastra } from '@mastra/core/mastra';
import { PinoLogger } from '@mastra/loggers';
import { PostgresStore } from '@mastra/pg';

import { env } from '../env';
import { generalAgent } from './agents/general';
import { describeChatError } from './chat-error';
import { prepareChatRequest } from './middleware/prepare-chat-request';
import { modelCatalogRoute } from './model-catalog-route';

const logger = new PinoLogger({
	name: 'house-elf',
	level: 'info'
});

export const mastra = new Mastra({
	agents: { general: generalAgent },
	server: {
		// Runs before the chat route, which would otherwise hand the body's `model`
		// and `providerOptions` straight to the provider.
		middleware: [prepareChatRequest],
		apiRoutes: [
			modelCatalogRoute,
			// Dynamic form: every agent registered above is reachable without a new
			// route. Reasoning and sources are off by default; the UI renders both.
			// `version` is left at its default ('v5'). For a text-only response the
			// v5 and v6 chunk streams were verified byte-identical, so the choice is
			// deferred to T1.4 when the real @ai-sdk/svelte client can decide it.
			chatRoute({
				path: '/chat/:agentId',
				sendReasoning: true,
				sendSources: true,
				// The default serializer streams the provider's error to the browser,
				// stack trace and upstream URL included. Detail belongs in the log.
				onError: (error) => {
					logger.error('Chat generation failed', { error });
					return describeChatError(error);
				}
			})
		]
	},
	storage: new PostgresStore({
		id: 'house-elf-storage',
		connectionString: env.databaseUrl
	}),
	logger
});
