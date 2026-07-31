import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

/**
 * The clock is a parameter rather than a call to `new Date()` inside the tool
 * body, so the formatting logic can be tested against a fixed instant.
 */
export function currentTimeIn(timeZone: string, now: Date) {
	let formatter: Intl.DateTimeFormat;
	try {
		formatter = new Intl.DateTimeFormat('en-GB', {
			timeZone,
			dateStyle: 'full',
			timeStyle: 'long'
		});
	} catch {
		// Intl throws RangeError for an unrecognised zone. Re-thrown with the
		// correction the model needs to retry successfully.
		throw new Error(
			`Unknown time zone "${timeZone}". Use an IANA identifier such as ` +
				`"Europe/London", "Asia/Tokyo" or "America/New_York".`
		);
	}

	return {
		timeZone: formatter.resolvedOptions().timeZone,
		localTime: formatter.format(now),
		utcTime: now.toISOString()
	};
}

export const getCurrentTimeTool = createTool({
	id: 'get-current-time',
	description:
		'Get the current date and time in a given IANA time zone. Call this whenever ' +
		'the user asks what the time or date is, anywhere in the world, including for ' +
		'"now" or "today". You have no reliable knowledge of the current time, so never ' +
		'answer such a question from memory.',
	inputSchema: z.object({
		timeZone: z
			.string()
			.describe(
				'IANA time zone identifier, such as "Europe/London", "Asia/Tokyo" or ' +
					'"America/New_York". Infer it from the place the user named. If the user ' +
					'named no place, use "UTC".'
			)
	}),
	outputSchema: z.object({
		timeZone: z.string().describe('The IANA time zone the time below is expressed in.'),
		localTime: z.string().describe('The current date and time in that zone, already formatted.'),
		utcTime: z.string().describe('The same instant in UTC, as an ISO 8601 string.')
	}),
	// Not `async`: there is nothing to await. The clock is passed in so the
	// formatting logic stays testable against a fixed instant.
	execute: ({ timeZone }) => Promise.resolve(currentTimeIn(timeZone, new Date()))
});
