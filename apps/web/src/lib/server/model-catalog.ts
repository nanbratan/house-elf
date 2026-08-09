import { modelCatalogSchema } from '@house-elf/shared';
import type { ModelCatalog } from '@house-elf/shared';

import { mastraUrl } from './mastra';

/**
 * Separate from the `createServerFn` wrapper because a server function only
 * executes inside TanStack Start's request context — this half can be called
 * directly in a test.
 */
export async function loadModelCatalog(): Promise<ModelCatalog> {
	const response = await fetch(`${mastraUrl()}/models`);
	return modelCatalogSchema.parse(await response.json());
}
