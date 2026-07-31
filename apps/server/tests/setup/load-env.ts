/**
 * Integration tests read connection strings from the repo-root `.env`. Vitest runs
 * under Node, so Bun's automatic `.env` loading does not apply and the file has to be
 * loaded explicitly.
 */
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const envFile = fileURLToPath(new URL('../../../../.env', import.meta.url));

if (existsSync(envFile)) {
	process.loadEnvFile(envFile);
}

if (process.env.TEST_DATABASE_URL === undefined) {
	throw new Error(
		'TEST_DATABASE_URL is not set. Copy .env.example to .env at the repo root, ' +
			'then start the test database with `bun run db:up`.'
	);
}
