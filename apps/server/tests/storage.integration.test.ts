import type { PostgresStore } from '@mastra/pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createTestStore, uniqueId } from './helpers/test-store.ts';

/**
 * Proves the integration layer is real: a live Postgres, Mastra's own schema, and a
 * round trip through the storage API. Memory scoping is exercised here only as far as
 * threads go — the high-value working-memory-across-threads test arrives with M2.
 */
describe('PostgresStore against postgres-test', () => {
	let store: PostgresStore;

	beforeAll(async () => {
		store = createTestStore();
		// Tables are created by Mastra on init. Without this, operations fail.
		await store.init();
	});

	afterAll(async () => {
		await store.close();
	});

	it('has the pgvector extension available', async () => {
		const rows = await store.db.any<{ name: string }>(
			`SELECT name FROM pg_available_extensions WHERE name = 'vector'`
		);

		expect(rows.map((row) => row.name)).toContain('vector');
	});

	it('writes a thread and reads it back', async () => {
		const memory = await store.getStore('memory');
		expect(memory).toBeDefined();

		const threadId = uniqueId('thread');
		const resourceId = uniqueId('resource');
		const now = new Date();

		await memory?.saveThread({
			thread: {
				id: threadId,
				resourceId,
				title: 'Round trip',
				createdAt: now,
				updatedAt: now,
				metadata: { source: 'integration-test' }
			}
		});

		const found = await memory?.getThreadById({ threadId });

		expect(found).not.toBeNull();
		expect(found?.id).toBe(threadId);
		expect(found?.resourceId).toBe(resourceId);
		expect(found?.title).toBe('Round trip');
		expect(found?.metadata).toEqual({ source: 'integration-test' });
	});

	it('does not return a thread when the resource does not own it', async () => {
		const memory = await store.getStore('memory');

		const threadId = uniqueId('thread');
		const now = new Date();

		await memory?.saveThread({
			thread: {
				id: threadId,
				resourceId: uniqueId('resource'),
				title: 'Owned by someone else',
				createdAt: now,
				updatedAt: now,
				metadata: {}
			}
		});

		const found = await memory?.getThreadById({
			threadId,
			resourceId: uniqueId('resource')
		});

		expect(found).toBeNull();
	});

	it('deletes a thread', async () => {
		const memory = await store.getStore('memory');

		const threadId = uniqueId('thread');
		const now = new Date();

		await memory?.saveThread({
			thread: {
				id: threadId,
				resourceId: uniqueId('resource'),
				title: 'Temporary',
				createdAt: now,
				updatedAt: now,
				metadata: {}
			}
		});
		expect(await memory?.getThreadById({ threadId })).not.toBeNull();

		await memory?.deleteThread({ threadId });

		expect(await memory?.getThreadById({ threadId })).toBeNull();
	});
});
