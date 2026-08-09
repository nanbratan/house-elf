import { act, render, screen } from '@testing-library/react';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { optionalThinking, selectableModel } from '../../helpers/models.ts';
import { ChatView } from '../../../src/lib/components/chat/ChatView.tsx';
import { Composer } from '../../../src/lib/components/chat/Composer.tsx';
import { MessageTranscript } from '../../../src/lib/components/chat/MessageTranscript.tsx';

vi.mock('@ai-sdk/react', () => ({
	useChat: vi.fn()
}));

vi.mock('ai', async (importOriginal) => ({
	...(await importOriginal<object>()),
	DefaultChatTransport: vi.fn()
}));

// The transcript is tested at its own boundary; here it is a stub whose call
// history records what ChatView passed it.
vi.mock('../../../src/lib/components/chat/MessageTranscript.tsx', () => ({
	MessageTranscript: vi.fn(() => <div data-testid="message-transcript" />)
}));

// Composer owns its own keyboard/IME/busy behaviour, tested at its own
// boundary; here it is a stub whose call history records the contract
// ChatView owes it — the props it's handed, and that its callbacks reach
// `chat.sendMessage` (with the per-message body override), `chat.stop`, and
// the model-selection setters.
vi.mock('../../../src/lib/components/chat/Composer.tsx', () => ({
	Composer: vi.fn(() => <div data-testid="composer" />)
}));

type ChatState = ReturnType<typeof useChat>;

function chatState(overrides: Partial<ChatState> = {}): ChatState {
	return {
		messages: [],
		status: 'ready',
		error: undefined,
		sendMessage: vi.fn<ChatState['sendMessage']>(),
		regenerate: vi.fn<ChatState['regenerate']>(),
		stop: vi.fn<ChatState['stop']>(),
		clearError: vi.fn<ChatState['clearError']>(),
		setMessages: vi.fn<ChatState['setMessages']>(),
		resumeStream: vi.fn<ChatState['resumeStream']>(),
		addToolResult: vi.fn<ChatState['addToolResult']>(),
		addToolOutput: vi.fn<ChatState['addToolOutput']>(),
		addToolApprovalResponse: vi.fn<ChatState['addToolApprovalResponse']>(),
		id: 'chat-id',
		...overrides
	};
}

const modelCatalog = {
	initialModelId: 'openrouter/auto',
	models: [
		selectableModel({ id: 'openrouter/auto', ...optionalThinking }),
		selectableModel({ id: 'anthropic/claude-sonnet-4-6', ...optionalThinking })
	]
} as const;
const mockedUseChat = vi.mocked(useChat);
const mockedTransport = vi.mocked(DefaultChatTransport);
const transcriptProps = () => vi.mocked(MessageTranscript).mock.lastCall?.[0];
const composerProps = () => vi.mocked(Composer).mock.lastCall?.[0];

describe('ChatView', () => {
	beforeEach(() => {
		mockedUseChat.mockReset();
		localStorage.clear();
	});

	it('builds a transport for the agent, with no model or thinking baked in', () => {
		mockedUseChat.mockReturnValue(chatState());

		render(<ChatView agentId="general" modelCatalog={modelCatalog} />);

		// Baking either in here would send whatever was initial rather than
		// whatever the reader had chosen by the time they actually sent — see
		// `send` below, where both travel per message instead.
		expect(mockedTransport).toHaveBeenCalledWith({ api: '/api/chat/general' });
	});

	it("sends the drafted message with the reader's current model and thinking choice", () => {
		const state = chatState();
		mockedUseChat.mockReturnValue(state);

		render(<ChatView agentId="general" modelCatalog={modelCatalog} />);

		composerProps()?.onSend('Hello world');

		expect(state.sendMessage).toHaveBeenCalledExactlyOnceWith(
			{ text: 'Hello world' },
			{ body: { model: 'openrouter/auto', thinking: false } }
		);
	});

	it('stops an in-flight stream', () => {
		const state = chatState({ status: 'streaming' });
		mockedUseChat.mockReturnValue(state);

		render(<ChatView agentId="general" modelCatalog={modelCatalog} />);

		composerProps()?.onStop();

		expect(state.stop).toHaveBeenCalledOnce();
	});

	it('hands the chat state to the transcript and wires retry to regenerate', () => {
		const state = chatState({
			status: 'error',
			error: new Error('Broken stream'),
			messages: [
				{
					id: 'message-1',
					role: 'user',
					parts: [{ type: 'text', text: 'Hello' }]
				}
			]
		});
		mockedUseChat.mockReturnValue(state);

		render(<ChatView agentId="general" modelCatalog={modelCatalog} />);

		expect(transcriptProps()?.messages).toBe(state.messages);
		expect(transcriptProps()?.status).toBe('error');
		expect(transcriptProps()?.error?.message).toBe('Broken stream');

		transcriptProps()?.onRetry();

		expect(state.regenerate).toHaveBeenCalledOnce();
	});

	it('hands the catalog and the current selection to the composer, and status besides', () => {
		mockedUseChat.mockReturnValue(chatState({ status: 'streaming' }));

		render(<ChatView agentId="general" modelCatalog={modelCatalog} />);

		expect(composerProps()?.models).toBe(modelCatalog.models);
		expect(composerProps()?.selectedModelId).toBe('openrouter/auto');
		expect(composerProps()?.status).toBe('streaming');
	});

	it('acts on a model choice made through the composer, on the next send', () => {
		const state = chatState();
		mockedUseChat.mockReturnValue(state);

		render(<ChatView agentId="general" modelCatalog={modelCatalog} />);

		act(() => {
			composerProps()?.onModelSelect('anthropic/claude-sonnet-4-6');
		});
		composerProps()?.onSend('Hello again');

		expect(state.sendMessage).toHaveBeenCalledExactlyOnceWith(
			{ text: 'Hello again' },
			{ body: { model: 'anthropic/claude-sonnet-4-6', thinking: false } }
		);
	});

	it('acts on a thinking choice made through the composer, on the next send', () => {
		const state = chatState();
		mockedUseChat.mockReturnValue(state);

		render(<ChatView agentId="general" modelCatalog={modelCatalog} />);

		act(() => {
			composerProps()?.onThinkingChange(true);
		});
		composerProps()?.onSend('Think about this');

		expect(state.sendMessage).toHaveBeenCalledExactlyOnceWith(
			{ text: 'Think about this' },
			{ body: { model: 'openrouter/auto', thinking: true } }
		);
	});

	it('discards the transcript when the agent changes', () => {
		mockedUseChat.mockReturnValue(chatState());

		const { rerender } = render(<ChatView agentId="general" modelCatalog={modelCatalog} />);
		const beforeSwitch = screen.getByTestId('message-transcript');

		rerender(<ChatView agentId="other" modelCatalog={modelCatalog} />);

		// A missing key={agentId} would reuse the same DOM node across the switch.
		expect(screen.getByTestId('message-transcript')).not.toBe(beforeSwitch);
	});
});
