import { afterEach, describe, expect, it, vi } from 'vitest';

/**
 * `env.ts` validates at import time, so each case has to import it afresh with the
 * environment already arranged.
 */
async function importEnv() {
	vi.resetModules();
	return (await import('./env.ts')).env;
}

describe('env', () => {
	afterEach(() => {
		vi.unstubAllEnvs();
		vi.resetModules();
	});

	it('exposes the required variables', async () => {
		vi.stubEnv('DATABASE_URL', 'postgresql://user:pw@localhost:5432/db');

		const env = await importEnv();

		expect(env.databaseUrl).toBe('postgresql://user:pw@localhost:5432/db');
	});

	it('throws naming the variable when one is missing', async () => {
		vi.stubEnv('DATABASE_URL', undefined);

		await expect(importEnv()).rejects.toThrow('DATABASE_URL');
	});

	it('treats a whitespace-only value as missing', async () => {
		vi.stubEnv('DATABASE_URL', '   ');

		await expect(importEnv()).rejects.toThrow('DATABASE_URL');
	});

	it('points at .env.example so the fix is obvious', async () => {
		vi.stubEnv('DATABASE_URL', undefined);

		await expect(importEnv()).rejects.toThrow('.env.example');
	});
});
