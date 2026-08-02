import { error } from '@sveltejs/kit';

import { env } from '$env/dynamic/private';

/** The private Mastra origin used by SvelteKit's server-side request paths. */
export function mastraUrl(): string {
	if (!env.MASTRA_URL) {
		error(500, 'MASTRA_URL is not set. See apps/web/.env.example.');
	}
	return env.MASTRA_URL;
}
