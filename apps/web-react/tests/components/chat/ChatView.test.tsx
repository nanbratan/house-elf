import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { selectableModel } from '../../helpers/models.ts';
import { ChatView } from '../../../src/lib/components/chat/ChatView.tsx';
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
	models: [selectableModel({ id: 'openrouter/auto' })]
} as const;
const mockedUseChat = vi.mocked(useChat);
const mockedTransport = vi.mocked(DefaultChatTransport);
const transcriptProps = () => vi.mocked(MessageTranscript).mock.lastCall?.[0];

describe('ChatView', () => {
	beforeEach(() => {
		mockedUseChat.mockReset();
	});

	it('sends the drafted message to the agent endpoint with the catalog model', async () => {
		const user = userEvent.setup();
		const state = chatState();
		mockedUseChat.mockReturnValue(state);

		render(<ChatView agentId="general" modelCatalog={modelCatalog} />);

		await user.type(screen.getByRole('textbox', { name: 'Message' }), 'Hello world');
		await user.click(screen.getByRole('button', { name: 'Send' }));

		expect(state.sendMessage).toHaveBeenCalledWith({ text: 'Hello world' });
		expect(mockedTransport).toHaveBeenCalledWith({
			api: '/api/chat/general',
			body: { model: 'openrouter/auto', thinking: false }
		});
	});

	it('stops an in-flight stream', async () => {
		const user = userEvent.setup();
		const state = chatState({ status: 'streaming' });
		mockedUseChat.mockReturnValue(state);

		render(<ChatView agentId="general" modelCatalog={modelCatalog} />);

		await user.click(screen.getByRole('button', { name: 'Stop' }));

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

	it('discards the transcript when the agent changes', () => {
		mockedUseChat.mockReturnValue(chatState());

		const { rerender } = render(<ChatView agentId="general" modelCatalog={modelCatalog} />);
		const beforeSwitch = screen.getByTestId('message-transcript');

		rerender(<ChatView agentId="other" modelCatalog={modelCatalog} />);

		// A missing key={agentId} would reuse the same DOM node across the switch.
		expect(screen.getByTestId('message-transcript')).not.toBe(beforeSwitch);
	});
});
