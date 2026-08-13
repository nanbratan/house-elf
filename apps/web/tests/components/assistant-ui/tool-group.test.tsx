import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import {
	ToolGroupContent,
	ToolGroupRoot,
	ToolGroupTrigger
} from '../../../src/lib/components/assistant-ui/tool-group.tsx';

// `useScrollLock` is assistant-ui's, not ours: it measures and pins scroll offset
// across the collapse animation, which jsdom cannot do. Stubbed to a no-op so the
// collapsible's own open/close behaviour is what these tests observe.
vi.mock('@assistant-ui/react', () => ({ useScrollLock: () => () => undefined }));

// `ui/collapsible` is deliberately NOT stubbed. It is a props-to-class-names wrapper
// over base-ui with no logic of its own, and ui.instructions.md covers that case
// through its consumers rather than a dedicated test. Stubbing it here would leave
// nothing of the trigger/panel behaviour to observe.

// The trigger is a collapsible trigger: base-ui throws without a root above it, so it
// is always mounted inside one rather than rendered bare.
function renderTrigger(props: { count: number; active?: boolean }) {
	return render(
		<ToolGroupRoot>
			<ToolGroupTrigger active={props.active} count={props.count} />
		</ToolGroupRoot>
	);
}

describe('ToolGroupTrigger', () => {
	it('names a single tool call in the singular', () => {
		renderTrigger({ count: 1 });

		expect(screen.getByRole('button')).toHaveTextContent('1 tool call');
	});

	it('names several tool calls in the plural', () => {
		renderTrigger({ count: 4 });

		expect(screen.getByRole('button')).toHaveTextContent('4 tool calls');
	});

	it('offers no running affordance when the group has settled', () => {
		const { container } = renderTrigger({ count: 2 });

		expect(container.querySelector('[data-slot="tool-group-trigger-loader"]')).toBeNull();
		expect(container.querySelector('[data-slot="tool-group-trigger-shimmer"]')).toBeNull();
	});

	it('marks the group as working while a call is still running', () => {
		const { container } = renderTrigger({ active: true, count: 2 });

		expect(container.querySelector('[data-slot="tool-group-trigger-loader"]')).toBeInTheDocument();
		expect(container.querySelector('[data-slot="tool-group-trigger-shimmer"]')).toBeInTheDocument();
	});
});

describe('ToolGroupRoot', () => {
	it('starts collapsed, keeping the calls out of the reading path', () => {
		render(
			<ToolGroupRoot>
				<ToolGroupTrigger count={2} />
				<ToolGroupContent>
					<span>a tool call</span>
				</ToolGroupContent>
			</ToolGroupRoot>
		);

		expect(screen.queryByText('a tool call')).not.toBeInTheDocument();
	});

	it('starts open when asked to', () => {
		render(
			<ToolGroupRoot defaultOpen>
				<ToolGroupTrigger count={2} />
				<ToolGroupContent>
					<span>a tool call</span>
				</ToolGroupContent>
			</ToolGroupRoot>
		);

		expect(screen.getByText('a tool call')).toBeInTheDocument();
	});

	it('reveals the calls when the trigger is used', async () => {
		const user = userEvent.setup();

		render(
			<ToolGroupRoot>
				<ToolGroupTrigger count={2} />
				<ToolGroupContent>
					<span>a tool call</span>
				</ToolGroupContent>
			</ToolGroupRoot>
		);

		await user.click(screen.getByRole('button'));

		expect(screen.getByText('a tool call')).toBeInTheDocument();
	});

	it('reports a toggle to a controlling owner without moving on its own', async () => {
		const user = userEvent.setup();
		const onOpenChange = vi.fn();

		render(
			<ToolGroupRoot open={false} onOpenChange={onOpenChange}>
				<ToolGroupTrigger count={2} />
				<ToolGroupContent>
					<span>a tool call</span>
				</ToolGroupContent>
			</ToolGroupRoot>
		);

		await user.click(screen.getByRole('button'));

		expect(onOpenChange).toHaveBeenCalledWith(true);
		// The owner holds it shut: an uncontrolled component would have opened here.
		expect(screen.queryByText('a tool call')).not.toBeInTheDocument();
	});
});
