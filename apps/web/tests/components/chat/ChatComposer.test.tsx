import { render } from '@testing-library/react';
import { useAISDKChat } from '@assistant-ui/react-ai-sdk';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { optionalThinking, selectableModel } from '../../helpers/models.ts';
import { ChatComposer } from '../../../src/lib/components/chat/ChatComposer.tsx';
import { Composer } from '../../../src/lib/components/chat/Composer.tsx';
import type { ModelSelection } from '../../../src/lib/hooks/model-selection.ts';

vi.mock('@assistant-ui/react-ai-sdk', () => ({ useAISDKChat: vi.fn() }));

// Tested at its own boundary; here it is a stub whose call history records the
// contract ChatComposer owes it.
vi.mock('../../../src/lib/components/chat/Composer.tsx', () => ({
	Composer: vi.fn(() => <div data-testid="composer" />)
}));

type Chat = NonNullable<ReturnType<typeof useAISDKChat>>;

function chat(overrides: Partial<Chat> = {}) {
	return {
		status: 'ready',
		sendMessage: vi.fn(),
		stop: vi.fn(),
		...overrides
	} as unknown as Chat;
}

const model = selectableModel({ id: 'openrouter/auto', ...optionalThinking });
const models = [model];

function modelSelection(): ModelSelection {
	return {
		selectedModelId: 'openrouter/auto',
		selectedModel: model,
		thinking: false,
		canChooseThinking: true,
		select: vi.fn(),
		setThinking: vi.fn()
	};
}

const mockedChat = vi.mocked(useAISDKChat);
const composerProps = () => vi.mocked(Composer).mock.lastCall?.[0];

function renderComposer(selection = modelSelection()) {
	render(<ChatComposer models={models} modelSelection={selection} />);
	return selection;
}

describe('ChatComposer', () => {
	beforeEach(() => {
		mockedChat.mockReset();
	});

	it('sends the drafted message with nothing else attached', () => {
		const state = chat();
		mockedChat.mockReturnValue(state);

		renderComposer();
		composerProps()?.onSend('Hello world');

		// No per-message body: what the request carries is settled by the
		// transport, so a regenerate sends the same settings as a first ask.
		expect(state.sendMessage).toHaveBeenCalledExactlyOnceWith({ text: 'Hello world' });
	});

	it('stops an in-flight stream', () => {
		const state = chat({ status: 'streaming' });
		mockedChat.mockReturnValue(state);

		renderComposer();
		composerProps()?.onStop();

		expect(state.stop).toHaveBeenCalledOnce();
	});

	it('hands the catalog, the current selection and the status to the composer', () => {
		mockedChat.mockReturnValue(chat({ status: 'streaming' }));

		renderComposer();

		expect(composerProps()?.models).toBe(models);
		expect(composerProps()?.selectedModelId).toBe('openrouter/auto');
		expect(composerProps()?.thinking).toBe(false);
		expect(composerProps()?.canChooseThinking).toBe(true);
		expect(composerProps()?.status).toBe('streaming');
	});

	it('passes a model choice back to the selection that owns it', () => {
		mockedChat.mockReturnValue(chat());
		const select = vi.fn();

		renderComposer({ ...modelSelection(), select });
		composerProps()?.onModelSelect('anthropic/claude-sonnet-4-6');

		expect(select).toHaveBeenCalledExactlyOnceWith('anthropic/claude-sonnet-4-6');
	});

	it('passes a thinking choice back to the selection that owns it', () => {
		mockedChat.mockReturnValue(chat());
		const setThinking = vi.fn();

		renderComposer({ ...modelSelection(), setThinking });
		composerProps()?.onThinkingChange(true);

		expect(setThinking).toHaveBeenCalledExactlyOnceWith(true);
	});

	it('renders before the runtime has a chat to give it', () => {
		// `useAISDKChat` answers undefined until the thread is backed by one, and
		// the composer must still be usable rather than stuck looking busy.
		mockedChat.mockReturnValue(undefined);

		renderComposer();

		expect(composerProps()?.status).toBe('ready');
	});
});
