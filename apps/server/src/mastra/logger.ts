import { PinoLogger } from '@mastra/loggers';

/**
 * Its own module, not `index.ts`, so the catalog can log without importing the
 * Mastra instance that imports the catalog.
 */
export const logger = new PinoLogger({
	name: 'house-elf',
	level: 'info'
});
