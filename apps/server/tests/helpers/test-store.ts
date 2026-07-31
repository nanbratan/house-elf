import { randomUUID } from 'node:crypto';

import { PostgresStore } from '@mastra/pg';

/**
 * Helpers for tests that run against the disposable Postgres on :5433
 * (`postgres-test` in infra/docker-compose.yml).
 *
 * Every identifier is unique per call so tests never collide and can run in
 * parallel. The test database is tmpfs-backed and resets on restart, so nothing
 * here needs teardown SQL.
 */

function connectionString(): string {
	const url = process.env.TEST_DATABASE_URL;
	if (url === undefined || url.trim() === '') {
		throw new Error('TEST_DATABASE_URL is not set — see tests/setup/load-env.ts');
	}
	return url;
}

export function createTestStore(): PostgresStore {
	return new PostgresStore({
		id: `house-elf-test-${randomUUID()}`,
		connectionString: connectionString()
	});
}

/** A unique identifier, prefixed so stray rows are recognisable when debugging. */
export function uniqueId(kind: string): string {
	return `test-${kind}-${randomUUID()}`;
}
