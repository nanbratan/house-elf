import { registerApiRoute } from '@mastra/core/server';

import { modelCatalog } from './models';
import { CatalogUnavailableError } from './openrouter-catalog';

/** Public picker data, sourced from the same catalog that validates chat requests. */
export const modelCatalogRoute = registerApiRoute('/models', {
	method: 'GET',
	handler: async (context) => {
		try {
			return context.json(await modelCatalog());
		} catch (error) {
			if (error instanceof CatalogUnavailableError) {
				// 503, not 500: nothing here is broken, and a cold cache plus a failed
				// fetch is the one state the client should retry rather than report.
				return context.json({ error: error.message }, 503);
			}
			throw error;
		}
	}
});
