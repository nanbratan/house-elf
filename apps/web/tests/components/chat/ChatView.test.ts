import { render, screen, within } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

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

const ChatView = (await import('../../../src/lib/components/chat/ChatView.svelte')).default;

/** The nth message on screen. Throws rather than returning `undefined`. */
function messageAt(index: number): HTMLElement {
	const message = screen.getAllByRole('article').at(index);
	if (!message) throw new Error(`Expected a message at index ${String(index)}`);
	return message;
}

/** The parts handed to the renderer for one message, in document order. */
function partsIn(message: HTMLElement): (string | null)[] {
	return within(message)
		.getAllByTestId('part')
		.map((element) => element.textContent);
}

describe('chat view', () => {
	beforeEach(() => {
		mocks.state.messages = [];
		mocks.state.status = 'ready';
		mocks.state.error = undefined;
		mocks.transportOptions.length = 0;
		vi.clearAllMocks();
	});

	it('points the transport at the proxy route for the given agent', () => {
		render(ChatView, { props: { agentId: 'general' } });

		// Relative, so the browser never learns that Mastra exists.
		expect(mocks.transportOptions[0]?.api).toBe('/api/chat/general');
	});

	it('invites a first message when the conversation is empty', () => {
		render(ChatView, { props: { agentId: 'general' } });

		expect(screen.getByText('Ask anything.')).toBeInTheDocument();
	});

	it('attributes each message to its own author, and keeps their text apart', () => {
		mocks.state.messages = [
			{ id: '1', role: 'user', parts: [{ type: 'text', text: 'Hello' }] },
			{ id: '2', role: 'assistant', parts: [{ type: 'text', text: 'Hi there' }] }
		];

		render(ChatView, { props: { agentId: 'general' } });

		expect(screen.getAllByRole('article')).toHaveLength(2);

		const user = messageAt(0);
		expect(user).toHaveAttribute('data-role', 'user');
		expect(within(user).getByText('You')).toBeInTheDocument();
		expect(partsIn(user)).toStrictEqual(['text: Hello']);

		const assistant = messageAt(1);
		expect(assistant).toHaveAttribute('data-role', 'assistant');
		expect(within(assistant).getByText('house-elf')).toBeInTheDocument();
		expect(partsIn(assistant)).toStrictEqual(['text: Hi there']);

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

		render(ChatView, { props: { agentId: 'general' } });

		// Nothing is filtered on the way down: deciding what a part looks like,
		// including that some render as nothing, belongs one level lower.
		expect(partsIn(messageAt(0))).toStrictEqual([
			'text: Before the tool.',
			'tool-getCurrentTime',
			'text: After the tool.'
		]);
	});

	describe('after a failed reply', () => {
		beforeEach(() => {
			mocks.state.error = new Error('Upstream is down');
			mocks.state.status = 'error';
			mocks.state.messages = [{ id: '1', role: 'user', parts: [{ type: 'text', text: 'Hello' }] }];
		});

		it('hands the failure to the notice, and shows nothing when there is none', () => {
			const { unmount } = render(ChatView, { props: { agentId: 'general' } });

			expect(screen.getByTestId('error-notice')).toHaveTextContent('Upstream is down');

			unmount();
			mocks.state.error = undefined;
			render(ChatView, { props: { agentId: 'general' } });

			expect(screen.queryByTestId('error-notice')).not.toBeInTheDocument();
		});

		it('asks the same question again when the notice requests a retry', async () => {
			const user = userEvent.setup();
			render(ChatView, { props: { agentId: 'general' } });

			await user.click(screen.getByRole('button', { name: 'Retry' }));

			// No message id: the SDK keeps a trailing user message and re-asks, so
			// the reader does not have to retype anything.
			expect(mocks.regenerate).toHaveBeenCalledExactlyOnceWith();
		});

		it('leaves the composer usable, so the reader can move on instead', async () => {
			const user = userEvent.setup();
			render(ChatView, { props: { agentId: 'general' } });

			await user.type(screen.getByRole('textbox', { name: 'Message' }), 'Never mind{Enter}');

			expect(mocks.sendMessage).toHaveBeenCalledExactlyOnceWith({ text: 'Never mind' });
		});
	});

	it('hands a composed message to the chat', async () => {
		const user = userEvent.setup();
		render(ChatView, { props: { agentId: 'general' } });

		await user.type(screen.getByRole('textbox', { name: 'Message' }), 'Hello{Enter}');

		expect(mocks.sendMessage).toHaveBeenCalledExactlyOnceWith({ text: 'Hello' });
	});

	it('stops generation when the composer asks it to', async () => {
		const user = userEvent.setup();
		mocks.state.status = 'streaming';
		render(ChatView, { props: { agentId: 'general' } });

		await user.click(screen.getByRole('button', { name: 'Stop' }));

		expect(mocks.stop).toHaveBeenCalledOnce();
	});
});
