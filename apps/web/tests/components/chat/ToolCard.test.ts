import { render, screen, within } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import type { DynamicToolUIPart, ToolUIPart } from 'ai';
import { describe, expect, it } from 'vitest';

import ToolCard from '../../../src/lib/components/chat/ToolCard.svelte';

/**
 * The real part type is a discriminated union of seven states; tests build the
 * shape each case needs and cast at the boundary rather than satisfying fields
 * the card never reads. Typed from the SDK rather than from the component,
 * because ESLint's TypeScript program cannot see through a `.svelte` import.
 */
type Part = ToolUIPart | DynamicToolUIPart;

function renderCard(part: Partial<Part> & { state: string }) {
	return render(ToolCard, { props: { name: 'getCurrentTime', part: part as Part } });
}

const header = () => screen.getByRole('button', { name: /getCurrentTime/ });

/** The card shows two code blocks; assertions should say which one they mean. */
const section = (name: 'Input' | 'Result') => screen.getByRole('region', { name });

describe('tool card', () => {
	it('names the tool the model called', () => {
		renderCard({ state: 'input-available', input: {} });

		expect(header()).toHaveTextContent('getCurrentTime');
	});

	describe('while the tool is working', () => {
		it('opens itself, so the user sees progress without asking', () => {
			renderCard({ state: 'input-available', input: { timeZone: 'Asia/Tokyo' } });

			expect(header()).toHaveAttribute('aria-expanded', 'true');
			expect(screen.getByText('Running…')).toBeInTheDocument();
			expect(within(section('Input')).getByRole('code')).toHaveTextContent('Asia/Tokyo');
		});

		it('shows arguments that are still arriving, rather than waiting for valid JSON', () => {
			// `input-streaming` carries whatever fragment has been parsed so far.
			renderCard({ state: 'input-streaming', input: { timeZone: 'Asia/Tok' } });

			expect(screen.getByText('Preparing…')).toBeInTheDocument();
			expect(within(section('Input')).getByRole('code')).toHaveTextContent('Asia/Tok');
		});

		it('survives a call whose arguments have not started arriving', () => {
			// The first `input-streaming` part can carry no input at all, and
			// `JSON.stringify(undefined)` is not a string. Rendering it threw, which
			// took down the entire message, not just the card.
			expect(() => renderCard({ state: 'input-streaming', input: undefined })).not.toThrow();
			expect(screen.getByText('Preparing…')).toBeInTheDocument();
		});
	});

	describe('once the tool has finished', () => {
		it('collapses to a single line, with the result a click away', async () => {
			const user = userEvent.setup();
			renderCard({
				state: 'output-available',
				input: { timeZone: 'Asia/Tokyo' },
				output: { localTime: 'Friday 31 July 2026 at 21:10:00 JST' }
			});

			expect(header()).toHaveAttribute('aria-expanded', 'false');
			expect(screen.getByText('Done')).toBeInTheDocument();
			expect(screen.queryByRole('region', { name: 'Result' })).not.toBeInTheDocument();

			await user.click(header());

			expect(within(section('Result')).getByRole('code')).toHaveTextContent('21:10:00 JST');
			// The arguments stay available next to the result, not replaced by it.
			expect(within(section('Input')).getByRole('code')).toHaveTextContent('Asia/Tokyo');
		});

		it('stays open when it failed, and shows why', () => {
			renderCard({
				state: 'output-error',
				input: { timeZone: 'Mars/Olympus' },
				errorText: 'Unknown time zone "Mars/Olympus".'
			});

			expect(header()).toHaveAttribute('aria-expanded', 'true');
			expect(screen.getByText('Failed')).toBeInTheDocument();
			expect(screen.getByText(/Unknown time zone/)).toBeInTheDocument();
		});
	});

	it('lets the user close a running tool and stay closed', async () => {
		const user = userEvent.setup();
		renderCard({ state: 'input-available', input: {} });

		await user.click(header());

		expect(header()).toHaveAttribute('aria-expanded', 'false');
	});

	describe('the states a human has to act on', () => {
		it('stays open while approval is pending, because it is blocking the reply', () => {
			renderCard({ state: 'approval-requested', input: { command: 'rm -rf /' } });

			expect(header()).toHaveAttribute('aria-expanded', 'true');
			expect(screen.getByText('Waiting for approval')).toBeInTheDocument();
		});

		it('distinguishes an answered approval from a refused call', () => {
			const { unmount } = renderCard({ state: 'approval-responded', input: {} });
			expect(screen.getByText('Approval sent')).toBeInTheDocument();
			unmount();

			renderCard({ state: 'output-denied', input: {} });
			expect(screen.getByText('Denied')).toBeInTheDocument();
			expect(screen.getByText(/never ran/)).toBeInTheDocument();
		});
	});
});
