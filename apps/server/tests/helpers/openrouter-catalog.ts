import { vi } from 'vitest';

import fixture from '../../src/mastra/openrouter-catalog.fixture.json';

/**
 * A fetch that answers with a catalog body. The fixture is a verbatim slice of a
 * real `GET /api/v1/models/user` response recorded on 2026-08-04, not a
 * hand-written shape.
 */
export function respondWith(body: unknown = fixture, status = 200) {
	return vi.fn(() =>
		Promise.resolve({ ok: status < 400, status, json: () => Promise.resolve(body) })
	);
}

/**
 * `env.ts` validates at import time and the catalog module reads the key from
 * it, so anything that reaches the catalog needs both of these present.
 */
export function stubCatalogEnv(): void {
	vi.stubEnv('DATABASE_URL', 'postgresql://user:pw@localhost:5432/db');
	vi.stubEnv('OPENROUTER_API_KEY', 'sk-or-test');
}
