import { registerApiRoute } from '@mastra/core/server';

import { MODEL_CATALOG } from './models';

/** Public picker data, sourced from the same allowlist that validates chat requests. */
export const modelCatalogRoute = registerApiRoute('/models', {
	method: 'GET',
	handler: (context) => context.json(MODEL_CATALOG)
});
