import type { ReactElement } from 'react';
import { act, render } from '@testing-library/react';
import { isValidElement } from 'react';
import { AssistantRuntimeProvider } from '@assistant-ui/react';
import { useChatRuntime } from '@assistant-ui/react-ai-sdk';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { optionalThinking, selectableModel } from '../../helpers/models.ts';
import { Composer } from '../../../src/lib/components/chat/Composer.tsx';
import { Thread } from '../../../src/lib/components/chat/Thread.tsx';
import { ChatView } from '../../../src/lib/components/chat/ChatView.tsx';
import { createChatTransport } from '../../../src/lib/chat/transport.ts';

vi.mock('@assistant-ui/react', () => ({
	AssistantRuntimeProvider: vi.fn(({ children }: { children: React.ReactNode }) => children)
}));

vi.mock('@assistant-ui/react-ai-sdk', () => ({ useChatRuntime: vi.fn() }));

// What the transport does with the settings is its own test's business; here it
// is a stub whose call history records what ChatView passed down.
vi.mock('../../../src/lib/chat/transport.ts', () => ({ createChatTransport: vi.fn() }));

// Both are tested at their own boundary; here they are stubs whose call history
// records what ChatView handed them. The Thread stub renders its `composer` slot
// because that is the whole of what Thread does with it, and the composer's own
// props are only observable once it has been rendered.
vi.mock('../../../src/lib/components/chat/Thread.tsx', () => ({
	Thread: vi.fn(({ composer }: { composer: React.ReactNode }) => (
		<div data-testid="thread">{composer}</div>
	))
}));

vi.mock('../../../src/lib/components/chat/Composer.tsx', () => ({
	Composer: vi.fn(() => <div data-testid="composer" />)
}));

const modelCatalog = {
	initialModelId: 'openrouter/auto',
	models: [
		selectableModel({ id: 'openrouter/auto', ...optionalThinking }),
		selectableModel({ id: 'anthropic/claude-sonnet-4-6', ...optionalThinking })
	]
} as const;

// Stand-ins for the two objects ChatView wires together, so each can be shown to
// reach its destination rather than merely to have been created.
const transport = { api: '/api/chat/general' };
const runtime = { thread: 'stub-runtime' };

const composerProps = () => vi.mocked(Composer).mock.lastCall?.[0];
const transportOptions = () => vi.mocked(createChatTransport).mock.lastCall?.[0];

describe('ChatView', () => {
	beforeEach(() => {
		vi.mocked(createChatTransport).mockReset();
		vi.mocked(createChatTransport).mockReturnValue(transport as never);
		vi.mocked(useChatRuntime).mockReset();
		vi.mocked(useChatRuntime).mockReturnValue(runtime as never);
		localStorage.clear();
	});

	it('runs the conversation on the transport it built', () => {
		render(<ChatView agentId="general" modelCatalog={modelCatalog} />);

		// Without this the runtime keeps assistant-ui's own transport: requests go
		// to a default endpoint carrying `callSettings`/`config`/`tools` and no
		// `settings`, which the server refuses. Every other test here would still
		// pass, because they only watch what was handed to the builder.
		expect(vi.mocked(useChatRuntime).mock.lastCall?.[0]?.transport).toBe(transport);
	});

	it('puts the chat under that runtime, so both halves can reach it', () => {
		render(<ChatView agentId="general" modelCatalog={modelCatalog} />);

		expect(vi.mocked(AssistantRuntimeProvider).mock.lastCall?.[0]?.runtime).toBe(runtime);
		expect(vi.mocked(Thread)).toHaveBeenCalled();
		expect(vi.mocked(Composer)).toHaveBeenCalled();
	});

	// The composer belongs inside the thread's viewport, which only Thread can place
	// it in — but its props come from the model selection ChatView owns. So ChatView
	// builds the element and Thread is handed it, rather than the six props.
	it('hands the composer to the thread as an element rather than rendering it alongside', () => {
		render(<ChatView agentId="general" modelCatalog={modelCatalog} />);

		const slot = vi.mocked(Thread).mock.lastCall?.[0]?.composer;

		expect(isValidElement(slot)).toBe(true);
		expect((slot as ReactElement).type).toBe(Composer);
	});

	it('gives the transport the agent and the current choice', () => {
		render(<ChatView agentId="general" modelCatalog={modelCatalog} />);

		expect(transportOptions()).toEqual({
			agentId: 'general',
			settings: { model: 'openrouter/auto', thinking: false }
		});
	});

	it('passes on a model choice made through the composer', () => {
		render(<ChatView agentId="general" modelCatalog={modelCatalog} />);

		act(() => {
			composerProps()?.onModelSelect('anthropic/claude-sonnet-4-6');
		});

		expect(transportOptions()?.settings).toEqual({
			model: 'anthropic/claude-sonnet-4-6',
			thinking: false
		});
		// The transport carrying the new id is not enough: the composer has to be
		// told as well, or the picker keeps presenting the model it replaced.
		expect(composerProps()?.selectedModelId).toBe('anthropic/claude-sonnet-4-6');
	});

	it('passes on a thinking choice made through the composer', () => {
		render(<ChatView agentId="general" modelCatalog={modelCatalog} />);

		act(() => {
			composerProps()?.onThinkingChange(true);
		});

		expect(transportOptions()?.settings).toEqual({ model: 'openrouter/auto', thinking: true });
	});

	it('hands the catalog’s models and the current selection to the composer', () => {
		render(<ChatView agentId="general" modelCatalog={modelCatalog} />);

		expect(composerProps()?.models).toBe(modelCatalog.models);
		expect(composerProps()?.selectedModelId).toBe('openrouter/auto');
		expect(composerProps()?.thinking).toBe(false);
		expect(composerProps()?.canChooseThinking).toBe(true);
	});
});
