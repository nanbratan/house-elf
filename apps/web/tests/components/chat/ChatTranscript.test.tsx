import { render } from '@testing-library/react';
import { useAISDKChat, useAISDKError } from '@assistant-ui/react-ai-sdk';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ChatTranscript } from '../../../src/lib/components/chat/ChatTranscript.tsx';
import { MessageTranscript } from '../../../src/lib/components/chat/MessageTranscript.tsx';

vi.mock('@assistant-ui/react-ai-sdk', () => ({
	useAISDKChat: vi.fn(),
	useAISDKError: vi.fn()
}));

// Tested at its own boundary; here it is a stub whose call history records the
// contract ChatTranscript owes it.
vi.mock('../../../src/lib/components/chat/MessageTranscript.tsx', () => ({
	MessageTranscript: vi.fn(() => <div data-testid="message-transcript" />)
}));

type Chat = NonNullable<ReturnType<typeof useAISDKChat>>;

function chat(overrides: Partial<Chat> = {}) {
	return {
		messages: [],
		status: 'ready',
		regenerate: vi.fn(),
		...overrides
	} as unknown as Chat;
}

const mockedChat = vi.mocked(useAISDKChat);
const transcriptProps = () => vi.mocked(MessageTranscript).mock.lastCall?.[0];

describe('ChatTranscript', () => {
	beforeEach(() => {
		mockedChat.mockReset();
		vi.mocked(useAISDKError).mockReturnValue(undefined);
	});

	it('hands the runtime’s messages and status to the transcript', () => {
		const state = chat({
			status: 'streaming',
			messages: [{ id: 'message-1', role: 'user', parts: [{ type: 'text', text: 'Hello' }] }]
		});
		mockedChat.mockReturnValue(state);

		render(<ChatTranscript />);

		expect(transcriptProps()?.messages).toBe(state.messages);
		expect(transcriptProps()?.status).toBe('streaming');
	});

	it('surfaces a failed stream to the reader', () => {
		mockedChat.mockReturnValue(chat({ status: 'error' }));
		vi.mocked(useAISDKError).mockReturnValue(new Error('Broken stream'));

		render(<ChatTranscript />);

		expect(transcriptProps()?.error?.message).toBe('Broken stream');
	});

	it('retries by asking the runtime to generate again', () => {
		const state = chat();
		mockedChat.mockReturnValue(state);

		render(<ChatTranscript />);
		transcriptProps()?.onRetry();

		expect(state.regenerate).toHaveBeenCalledOnce();
	});

	it('renders before the runtime has a chat to give it', () => {
		// `useAISDKChat` answers undefined until the thread is backed by one, and
		// an empty transcript is what belongs on screen until then.
		mockedChat.mockReturnValue(undefined);

		render(<ChatTranscript />);

		expect(transcriptProps()?.messages).toEqual([]);
		expect(transcriptProps()?.status).toBe('ready');
	});
});
