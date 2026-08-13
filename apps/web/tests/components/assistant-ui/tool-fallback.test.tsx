import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
	ToolFallback,
	ToolFallbackApproval,
	ToolFallbackArgs,
	ToolFallbackError,
	ToolFallbackResult,
	ToolFallbackRoot,
	ToolFallbackTrigger
} from '../../../src/lib/components/assistant-ui/tool-fallback.tsx';

// Both are assistant-ui's, not ours. `useScrollLock` pins scroll across the collapse
// animation, which jsdom cannot measure; `useToolCallElapsed` reads the runtime's
// clock for this tool call, so the tests drive it directly to pin the duration format.
const elapsedMs = vi.fn<() => number | undefined>(() => undefined);

vi.mock('@assistant-ui/react', () => ({
	useScrollLock: () => () => undefined,
	useToolCallElapsed: () => elapsedMs()
}));

// `ui/collapsible` and `ui/button` are not stubbed: both are props-to-class-names
// wrappers over base-ui with no logic, which ui.instructions.md covers through their
// consumers rather than a dedicated test.

function renderTrigger(props: Parameters<typeof ToolFallbackTrigger>[0]) {
	return render(
		<ToolFallbackRoot>
			<ToolFallbackTrigger {...props} />
		</ToolFallbackRoot>
	);
}

describe('ToolFallbackTrigger', () => {
	beforeEach(() => {
		elapsedMs.mockReturnValue(undefined);
	});

	it('names the tool that ran', () => {
		renderTrigger({ toolName: 'getCurrentTime' });

		expect(screen.getByRole('button')).toHaveTextContent('Used tool: getCurrentTime');
	});

	it('says so when the call was cancelled rather than used', () => {
		renderTrigger({
			toolName: 'getCurrentTime',
			status: { type: 'incomplete', reason: 'cancelled' }
		});

		expect(screen.getByRole('button')).toHaveTextContent('Cancelled tool');
	});

	it('withholds a duration until the runtime reports one', () => {
		const { container } = renderTrigger({ toolName: 'getCurrentTime' });

		expect(container.querySelector('[data-slot="tool-fallback-duration"]')).toBeNull();
	});

	it('reports a sub-second call without a misleading zero', () => {
		elapsedMs.mockReturnValue(420);
		renderTrigger({ toolName: 'getCurrentTime' });

		expect(screen.getByRole('button')).toHaveTextContent('<1s');
	});

	it('keeps one decimal place while a call is under ten seconds', () => {
		elapsedMs.mockReturnValue(5550);
		renderTrigger({ toolName: 'getCurrentTime' });

		expect(screen.getByRole('button')).toHaveTextContent('5.5s');
	});

	it('drops to whole seconds once past ten', () => {
		elapsedMs.mockReturnValue(42_800);
		renderTrigger({ toolName: 'getCurrentTime' });

		expect(screen.getByRole('button')).toHaveTextContent('42s');
	});

	it('splits a call over a minute into minutes and seconds', () => {
		elapsedMs.mockReturnValue(125_000);
		renderTrigger({ toolName: 'getCurrentTime' });

		expect(screen.getByRole('button')).toHaveTextContent('2m 5s');
	});
});

describe('ToolFallbackArgs', () => {
	it('shows the arguments the tool was called with', () => {
		render(<ToolFallbackArgs argsText='{"timeZone":"Australia/Sydney"}' />);

		expect(screen.getByText('{"timeZone":"Australia/Sydney"}')).toBeInTheDocument();
	});

	// The first input-streaming chunk arrives before any argument text does.
	it('shows nothing at all before any argument text has streamed', () => {
		const { container } = render(<ToolFallbackArgs argsText="" />);

		expect(container).toBeEmptyDOMElement();
	});
});

describe('ToolFallbackResult', () => {
	it('renders a structured result as formatted JSON', () => {
		render(<ToolFallbackResult result={{ timeZone: 'Australia/Sydney' }} />);

		expect(screen.getByText(/"timeZone": "Australia\/Sydney"/)).toBeInTheDocument();
	});

	it('renders a string result as it stands, not re-quoted', () => {
		render(<ToolFallbackResult result="just text" />);

		expect(screen.getByText('just text')).toBeInTheDocument();
	});

	it('shows nothing while the tool has not returned', () => {
		const { container } = render(<ToolFallbackResult result={undefined} />);

		expect(container).toBeEmptyDOMElement();
	});
});

describe('ToolFallbackError', () => {
	it('shows nothing for a call that completed', () => {
		const { container } = render(<ToolFallbackError status={{ type: 'complete' }} />);

		expect(container).toBeEmptyDOMElement();
	});

	it('reports why a failed call failed', () => {
		render(<ToolFallbackError status={{ type: 'incomplete', reason: 'error', error: 'boom' }} />);

		expect(screen.getByText('Error:')).toBeInTheDocument();
		expect(screen.getByText('boom')).toBeInTheDocument();
	});

	it('frames a cancellation as a reason rather than an error', () => {
		render(
			<ToolFallbackError
				status={{ type: 'incomplete', reason: 'cancelled', error: 'user stopped it' }}
			/>
		);

		expect(screen.getByText('Cancelled reason:')).toBeInTheDocument();
	});

	it('shows nothing when a failure carries no detail to show', () => {
		const { container } = render(
			<ToolFallbackError status={{ type: 'incomplete', reason: 'error' }} />
		);

		expect(container).toBeEmptyDOMElement();
	});
});

describe('ToolFallbackApproval', () => {
	it('passes an approval to the runtime', async () => {
		const user = userEvent.setup();
		const respondToApproval = vi.fn();

		render(
			<ToolFallbackApproval
				approval={{ id: 'gate-1', options: [] }}
				respondToApproval={respondToApproval}
			/>
		);

		await user.click(screen.getByRole('button', { name: 'Allow' }));

		expect(respondToApproval).toHaveBeenCalledWith({ approved: true });
	});

	it('passes a refusal to the runtime', async () => {
		const user = userEvent.setup();
		const respondToApproval = vi.fn();

		render(
			<ToolFallbackApproval
				approval={{ id: 'gate-1', options: [] }}
				respondToApproval={respondToApproval}
			/>
		);

		await user.click(screen.getByRole('button', { name: 'Deny' }));

		expect(respondToApproval).toHaveBeenCalledWith({ approved: false });
	});

	// Without the latch a double-click sends two decisions for one gate.
	it('takes only the first decision', async () => {
		const user = userEvent.setup();
		const respondToApproval = vi.fn();

		render(
			<ToolFallbackApproval
				approval={{ id: 'gate-1', options: [] }}
				respondToApproval={respondToApproval}
			/>
		);

		await user.click(screen.getByRole('button', { name: 'Allow' }));
		await user.click(screen.getByRole('button', { name: 'Deny' }));

		expect(respondToApproval).toHaveBeenCalledOnce();
	});

	it('records the decision through addResult when there is no approval gate', async () => {
		const user = userEvent.setup();
		const addResult = vi.fn();

		render(<ToolFallbackApproval addResult={addResult} />);

		await user.click(screen.getByRole('button', { name: 'Deny' }));

		expect(addResult).toHaveBeenCalledWith('User denied tool execution');
	});

	it('shows nothing once the gate has already been answered', () => {
		const { container } = render(
			<ToolFallbackApproval
				approval={{ id: 'gate-1', approved: true, options: [] }}
				respondToApproval={vi.fn()}
			/>
		);

		expect(container).toBeEmptyDOMElement();
	});

	it('asks again before acting on an option that demands confirmation', async () => {
		const user = userEvent.setup();
		const respondToApproval = vi.fn();

		render(
			<ToolFallbackApproval
				approval={{
					id: 'gate-1',
					options: [{ id: 'always', kind: 'allow-always', confirm: true }]
				}}
				respondToApproval={respondToApproval}
			/>
		);

		await user.click(screen.getByRole('button', { name: 'Always allow' }));

		expect(respondToApproval).not.toHaveBeenCalled();

		await user.click(screen.getByRole('button', { name: 'Confirm' }));

		expect(respondToApproval).toHaveBeenCalledWith({ optionId: 'always' });
	});
});

describe('ToolFallback', () => {
	beforeEach(() => {
		elapsedMs.mockReturnValue(undefined);
	});

	it('keeps a settled call collapsed', () => {
		render(
			<ToolFallback
				addResult={vi.fn()}
				args={{ timeZone: 'Australia/Sydney' }}
				argsText='{"timeZone":"Australia/Sydney"}'
				respondToApproval={vi.fn()}
				resume={vi.fn()}
				status={{ type: 'complete' }}
				toolCallId="call-1"
				toolName="getCurrentTime"
				type="tool-call"
			/>
		);

		expect(screen.queryByText('{"timeZone":"Australia/Sydney"}')).not.toBeInTheDocument();
	});

	// A gate the reader cannot see is a gate they cannot answer.
	it('opens itself when the call is waiting on the reader', () => {
		render(
			<ToolFallback
				addResult={vi.fn()}
				args={{ timeZone: 'Australia/Sydney' }}
				argsText='{"timeZone":"Australia/Sydney"}'
				respondToApproval={vi.fn()}
				resume={vi.fn()}
				status={{ type: 'requires-action', reason: 'interrupt' }}
				toolCallId="call-1"
				toolName="getCurrentTime"
				type="tool-call"
			/>
		);

		expect(screen.getByText('{"timeZone":"Australia/Sydney"}')).toBeInTheDocument();
	});
});
