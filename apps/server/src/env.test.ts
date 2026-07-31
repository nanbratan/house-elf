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
		vi.stubEnv('AGENT_GENERAL_MODEL', 'anthropic/claude-haiku-4-5');

		const env = await importEnv();

		expect(env.databaseUrl).toBe('postgresql://user:pw@localhost:5432/db');
		expect(env.generalAgentModel).toBe('anthropic/claude-haiku-4-5');
	});

	it('throws naming the variable when one is missing', async () => {
		vi.stubEnv('DATABASE_URL', undefined);
		vi.stubEnv('AGENT_GENERAL_MODEL', 'anthropic/claude-haiku-4-5');

		await expect(importEnv()).rejects.toThrow('DATABASE_URL');
	});

	it('treats a whitespace-only value as missing', async () => {
		vi.stubEnv('DATABASE_URL', 'postgresql://user:pw@localhost:5432/db');
		vi.stubEnv('AGENT_GENERAL_MODEL', '   ');

		await expect(importEnv()).rejects.toThrow('AGENT_GENERAL_MODEL');
	});

	it('points at .env.example so the fix is obvious', async () => {
		vi.stubEnv('DATABASE_URL', undefined);
		vi.stubEnv('AGENT_GENERAL_MODEL', undefined);

		await expect(importEnv()).rejects.toThrow('.env.example');
	});
});
