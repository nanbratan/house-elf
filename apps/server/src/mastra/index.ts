import { Mastra } from '@mastra/core/mastra';
import { PinoLogger } from '@mastra/loggers';
import { PostgresStore } from '@mastra/pg';

import { env } from '../env';
import { generalAgent } from './agents/general';

export const mastra = new Mastra({
	agents: { general: generalAgent },
	storage: new PostgresStore({
		id: 'house-elf-storage',
		connectionString: env.databaseUrl
	}),
	logger: new PinoLogger({
		name: 'house-elf',
		level: 'info'
	})
});
