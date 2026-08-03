import { render, screen, within } from '@testing-library/svelte';
import type { SelectableModel } from '@house-elf/shared';
import { tick } from 'svelte';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { composerStub, errorNoticeStub } from '../../stubs/keys';
import { stubCallback, stubProps, stubPropsOf } from '../../stubs/stub-props';

/**
 * `Chat` owns a network transport, so it is replaced wholesale. These tests are
 * about what `ChatView` renders for a given chat state; the streaming itself is
 * covered against the real server elsewhere.
 */
const mocks = vi.hoisted(() => {
	const state: {
		messages: { id: string; role: string; parts: { type: string; text?: string }[] }[];
		status: string;
		error: Error | undefined;
	} = { messages: [], status: 'ready', error: undefined };

	return {
		state,
		sendMessage: vi.fn(),
		regenerate: vi.fn(),
		stop: vi.fn(),
		transportOptions: [] as { api?: string }[]
	};
});

vi.mock('@ai-sdk/svelte', () => ({
	Chat: class {
		sendMessage = mocks.sendMessage;
		regenerate = mocks.regenerate;
		stop = mocks.stop;
		get messages() {
			return mocks.state.messages;
		}
		get status() {
			return mocks.state.status;
		}
		get error() {
			return mocks.state.error;
		}
	}
}));

// `ChatView` only reaches for the transport, and the part renderer is stubbed,
// so nothing here needs the real module.
vi.mock('ai', () => ({
	// A `function`, not an arrow: `ChatView` calls it with `new`.
	DefaultChatTransport: vi.fn(function (this: unknown, options: { api?: string }) {
		mocks.transportOptions.push(options);
	})
}));

// What a part renders is `MessagePart`'s business. These tests are about the
// frame around it: whose message it is, and which parts reach it.
vi.mock('../../../src/lib/components/chat/MessagePart.svelte', async () => ({
	default: (await import('../../stubs/MessagePartStub.svelte')).default
}));

// Likewise the wording of a failure and how it is presented: `ChatView`'s share is
// which failure, and what the retry does.
vi.mock('../../../src/lib/components/chat/ErrorNotice.svelte', async () => ({
	default: (await import('../../stubs/ErrorNoticeStub.svelte')).default
}));

vi.mock('../../../src/lib/components/chat/Composer.svelte', async () => ({
	default: (await import('../../stubs/ComposerStub.svelte')).default
}));

vi.mock('../../../src/lib/components/chat/StickToBottom.svelte', async () => ({
	default: (await import('../../stubs/StickToBottomStub.svelte')).default
}));

const ChatView = (await import('../../../src/lib/components/chat/ChatView.svelte')).default;

const modelCatalog = {
	initialModelId: 'anthropic/claude-haiku-4-5',
	models: [
		{
			id: 'anthropic/claude-opus-5',
			label: 'Opus 5',
			family: 'opus',
			generation: '5',
			thinking: 'optional'
		},
		{
			id: 'anthropic/claude-sonnet-4-6',
			label: 'Sonnet 4.6',
			family: 'sonnet',
			generation: '4.6',
			thinking: 'optional'
		},
		{
			id: 'anthropic/claude-haiku-4-5',
			label: 'Haiku 4.5',
			family: 'haiku',
			generation: '4.5',
			thinking: 'optional'
		}
	]
} as const;

function renderChatView() {
	return render(ChatView, { props: { agentId: 'general', modelCatalog } });
}

/** The nth message on screen. Throws rather than returning `undefined`. */
function messageAt(index: number): HTMLElement {
	const message = screen.getAllByRole('article').at(index);
	if (!message) throw new Error(`Expected a message at index ${String(index)}`);
	return message;
}

/** The parts handed to the renderer for one message, in document order. */
function partsIn(message: HTMLElement): { type: string; text?: string }[] {
	return within(message)
		.getAllByTestId('part')
		.map((element) => stubPropsOf(element).part as { type: string; text?: string });
}

function composerProps(): {
	status: string;
	models: readonly SelectableModel[];
	selectedModelId: string;
	thinking: boolean;
} {
	const { status, models, selectedModelId, thinking } = stubProps(composerStub);
	return {
		status: status as string,
		models: models as readonly SelectableModel[],
		selectedModelId: selectedModelId as string,
		thinking: thinking as boolean
	};
}

/** The request body of each `sendMessage` call, in order. */
function sentBodies(): Record<string, unknown>[] {
	return mocks.sendMessage.mock.calls.map(
		(call) => (call[1] as { body: Record<string, unknown> }).body
	);
}

describe('chat view', () => {
	beforeEach(() => {
		mocks.state.messages = [];
		mocks.state.status = 'ready';
		mocks.state.error = undefined;
		mocks.transportOptions.length = 0;
		localStorage.clear();
		vi.clearAllMocks();
	});

	it('points the transport at the proxy route for the given agent', () => {
		renderChatView();

		// Relative, so the browser never learns that Mastra exists.
		expect(mocks.transportOptions[0]?.api).toBe('/api/chat/general');
	});

	it('invites a first message when the conversation is empty', () => {
		renderChatView();

		expect(screen.getByText('Ask anything.')).toBeInTheDocument();
	});

	it('hands the catalog, current selection, and chat status to the composer', () => {
		renderChatView();

		expect(composerProps()).toStrictEqual({
			status: 'ready',
			models: modelCatalog.models,
			selectedModelId: 'anthropic/claude-haiku-4-5',
			thinking: false
		});
	});

	it('attributes each message to its own author, and keeps their text apart', () => {
		mocks.state.messages = [
			{ id: '1', role: 'user', parts: [{ type: 'text', text: 'Hello' }] },
			{ id: '2', role: 'assistant', parts: [{ type: 'text', text: 'Hi there' }] }
		];

		renderChatView();

		expect(screen.getAllByRole('article')).toHaveLength(2);

		const user = messageAt(0);
		expect(user).toHaveAttribute('data-role', 'user');
		expect(within(user).getByText('You')).toBeInTheDocument();
		expect(partsIn(user)).toStrictEqual([{ type: 'text', text: 'Hello' }]);

		const assistant = messageAt(1);
		expect(assistant).toHaveAttribute('data-role', 'assistant');
		expect(within(assistant).getByText('house-elf')).toBeInTheDocument();
		expect(partsIn(assistant)).toStrictEqual([{ type: 'text', text: 'Hi there' }]);

		expect(screen.queryByText('Ask anything.')).not.toBeInTheDocument();
	});

	it('passes every part of a multi-part reply on, in order', () => {
		mocks.state.messages = [
			{
				id: '1',
				role: 'assistant',
				parts: [
					{ type: 'text', text: 'Before the tool.' },
					{ type: 'tool-getCurrentTime' },
					{ type: 'text', text: 'After the tool.' }
				]
			}
		];

		renderChatView();

		// Nothing is filtered on the way down: deciding what a part looks like,
		// including that some render as nothing, belongs one level lower.
		expect(partsIn(messageAt(0))).toStrictEqual([
			{ type: 'text', text: 'Before the tool.' },
			{ type: 'tool-getCurrentTime' },
			{ type: 'text', text: 'After the tool.' }
		]);
	});

	describe('after a failed reply', () => {
		beforeEach(() => {
			mocks.state.error = new Error('Upstream is down');
			mocks.state.status = 'error';
			mocks.state.messages = [{ id: '1', role: 'user', parts: [{ type: 'text', text: 'Hello' }] }];
		});

		it('hands the failure to the notice, and shows nothing when there is none', () => {
			const { unmount } = renderChatView();

			expect(stubProps(errorNoticeStub).error).toStrictEqual(new Error('Upstream is down'));

			unmount();
			mocks.state.error = undefined;
			renderChatView();

			expect(screen.queryByTestId('error-notice')).not.toBeInTheDocument();
		});

		it('asks the same question again when the notice requests a retry', () => {
			renderChatView();

			stubCallback(errorNoticeStub, 'onretry')();

			// No message id: the SDK keeps a trailing user message and re-asks, so
			// the reader does not have to retype anything.
			expect(mocks.regenerate).toHaveBeenCalledExactlyOnceWith();
		});

		it('tells the composer that the failed request is over', () => {
			renderChatView();

			expect(composerProps().status).toBe('error');
		});
	});

	it('hands a composed message to the chat', () => {
		renderChatView();

		stubCallback(composerStub, 'onsend')('Hello from the composer');

		expect(mocks.sendMessage).toHaveBeenCalledExactlyOnceWith(
			{ text: 'Hello from the composer' },
			{ body: { model: 'anthropic/claude-haiku-4-5', thinking: false } }
		);
	});

	it('sends the next message with the model chosen in the composer', async () => {
		renderChatView();

		stubCallback(composerStub, 'onmodelselect')('anthropic/claude-sonnet-4-6');
		await tick();
		expect(composerProps().selectedModelId).toBe('anthropic/claude-sonnet-4-6');

		stubCallback(composerStub, 'onsend')('Hello from the composer');

		expect(mocks.sendMessage).toHaveBeenCalledExactlyOnceWith(
			{ text: 'Hello from the composer' },
			{ body: { model: 'anthropic/claude-sonnet-4-6', thinking: false } }
		);
	});

	it('carries the thinking choice made at the moment of asking', async () => {
		renderChatView();

		stubCallback(composerStub, 'onsend')('First');

		stubCallback(composerStub, 'onthinkingchange')(true);
		await tick();
		expect(composerProps().thinking).toBe(true);

		stubCallback(composerStub, 'onsend')('Second');

		// Two sends, same thread, different bodies — the flag is per message.
		expect(sentBodies().map((body) => body.thinking)).toEqual([false, true]);
	});

	it('sends only a boolean, never anything the provider would honour verbatim', () => {
		renderChatView();
		stubCallback(composerStub, 'onthinkingchange')(true);

		stubCallback(composerStub, 'onsend')('Hello');

		expect(Object.keys(sentBodies()[0]).toSorted()).toEqual(['model', 'thinking']);
	});

	it('stops generation when the composer asks it to', () => {
		mocks.state.status = 'streaming';
		renderChatView();

		stubCallback(composerStub, 'onstop')();

		expect(mocks.stop).toHaveBeenCalledOnce();
	});
});
