import { describe, expect, it } from 'vitest';

import { cn } from '../../src/lib/utils/cn.ts';

describe('cn', () => {
	it('lets a later Tailwind class beat an earlier one it conflicts with', () => {
		expect(cn('bg-primary', 'bg-red-500')).toBe('bg-red-500');
	});

	it('keeps classes that do not conflict', () => {
		expect(cn('inline-flex', 'rounded-md')).toBe('inline-flex rounded-md');
	});

	it('drops falsy values, so a caller can pass a conditional class inline', () => {
		expect(cn('inline-flex', false, undefined, null, '')).toBe('inline-flex');
	});
});
