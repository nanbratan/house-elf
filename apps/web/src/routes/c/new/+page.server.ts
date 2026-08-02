import { modelCatalogSchema } from '@house-elf/shared';

import { mastraUrl } from '$lib/server/mastra';

import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ fetch }) => {
	const response = await fetch(`${mastraUrl()}/models`);
	return { modelCatalog: modelCatalogSchema.parse(await response.json()) };
};
