import { RequestContext } from '@mastra/core/request-context';
import { noopObserve } from '@mastra/core/tools';
import { describe, expect, it } from 'vitest';

import { currentTimeIn, getCurrentTimeTool } from './get-current-time';

// A fixed instant, so every expectation below is exact rather than approximate.
// 2026-07-31T12:00:00Z — a summer date, chosen so the northern-hemisphere zones
// are on daylight saving time and the offsets differ from their winter values.
const instant = new Date('2026-07-31T12:00:00.000Z');

describe('currentTimeIn', () => {
	it('reports the instant in the requested zone, not the host zone', () => {
		const tokyo = currentTimeIn('Asia/Tokyo', instant);
		const newYork = currentTimeIn('America/New_York', instant);

		// Same instant, different wall clocks: Tokyo is UTC+9, New York UTC-4 in July.
		expect(tokyo.localTime).toContain('21:00:00');
		expect(newYork.localTime).toContain('08:00:00');

		// ...and the underlying instant is unchanged by the formatting.
		expect(tokyo.utcTime).toBe('2026-07-31T12:00:00.000Z');
		expect(newYork.utcTime).toBe(tokyo.utcTime);
	});

	it('rolls the date over when the zone is far enough ahead', () => {
		const auckland = currentTimeIn('Pacific/Auckland', new Date('2026-07-31T23:00:00.000Z'));

		// UTC+12 in July, so 23:00 UTC on the 31st is already the 1st there.
		expect(auckland.localTime).toContain('1 August 2026');
	});

	it('applies daylight saving time rather than a fixed offset', () => {
		const summer = currentTimeIn('Europe/London', instant);
		const winter = currentTimeIn('Europe/London', new Date('2026-01-31T12:00:00.000Z'));

		expect(summer.localTime).toContain('13:00:00'); // BST, UTC+1
		expect(winter.localTime).toContain('12:00:00'); // GMT, UTC+0
	});

	it('echoes back the canonical zone name', () => {
		expect(currentTimeIn('UTC', instant).timeZone).toBe('UTC');
	});

	it('throws a message naming the bad zone and showing the expected format', () => {
		// The model reads this text and retries, so it has to be actionable.
		expect(() => currentTimeIn('Mars/Olympus_Mons', instant)).toThrow(
			/Unknown time zone "Mars\/Olympus_Mons".*IANA/s
		);
	});

	it('rejects a plain city name, which is the likeliest wrong guess', () => {
		expect(() => currentTimeIn('Tokyo', instant)).toThrow(/Unknown time zone/);
	});
});

describe('getCurrentTimeTool', () => {
	it('passes the requested zone through and returns the declared output shape', async () => {
		// `execute` is optional on the Tool type — tools can be defined for
		// execution elsewhere — so it has to be narrowed before being called.
		const { execute } = getCurrentTimeTool;
		if (!execute) throw new Error('getCurrentTimeTool has no execute function');

		// The runtime always supplies these two; `noopObserve` is exported by
		// Mastra for exactly this case.
		const result = await execute(
			{ timeZone: 'Asia/Tokyo' },
			{ observe: noopObserve, requestContext: new RequestContext() }
		);

		// The clock here is the real one, so assert on structure and zone rather
		// than an exact time — the exact formatting is covered above.
		expect(result).toMatchObject({ timeZone: 'Asia/Tokyo' });
		expect(Object.keys(result ?? {}).sort()).toStrictEqual(['localTime', 'timeZone', 'utcTime']);
	});
});
