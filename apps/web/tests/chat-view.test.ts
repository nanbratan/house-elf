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
		stop: vi.fn(),
		transportOptions: [] as { api?: string }[]
	};
});

vi.mock('@ai-sdk/svelte', () => ({
	Chat: class {
		sendMessage = mocks.sendMessage;
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

vi.mock('ai', () => ({
	// A `function`, not an arrow: `ChatView` calls it with `new`.
	DefaultChatTransport: vi.fn(function (this: unknown, options: { api?: string }) {
		mocks.transportOptions.push(options);
	})
}));

const ChatView = (await import('../src/lib/components/chat/ChatView.svelte')).default;

/** The nth message on screen. Throws rather than returning `undefined`. */
function messageAt(index: number): HTMLElement {
	const message = screen.getAllByRole('article').at(index);
	if (!message) throw new Error(`Expected a message at index ${String(index)}`);
	return message;
}

/** The rendered text of one message, in document order. */
function textsIn(message: HTMLElement): (string | null)[] {
	return [...message.querySelectorAll('p')].map((paragraph) => paragraph.textContent);
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
		expect(textsIn(user)).toStrictEqual(['Hello']);

		const assistant = messageAt(1);
		expect(assistant).toHaveAttribute('data-role', 'assistant');
		expect(within(assistant).getByText('house-elf')).toBeInTheDocument();
		expect(textsIn(assistant)).toStrictEqual(['Hi there']);

		expect(screen.queryByText('Ask anything.')).not.toBeInTheDocument();
	});

	it('renders every text part of a multi-part reply, in order', () => {
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

		// One message, both texts, in the order the model produced them, with the
		// part this milestone cannot render yet contributing nothing in between.
		expect(textsIn(messageAt(0))).toStrictEqual(['Before the tool.', 'After the tool.']);
	});

	it('ignores part types it does not understand rather than throwing', () => {
		mocks.state.messages = [
			{ id: '1', role: 'assistant', parts: [{ type: 'some-future-part-type' }] }
		];

		expect(() => render(ChatView, { props: { agentId: 'general' } })).not.toThrow();
		expect(textsIn(messageAt(0))).toStrictEqual([]);
	});

	it('surfaces an error to assistive technology as well as on screen', () => {
		mocks.state.error = new Error('Upstream is down');

		render(ChatView, { props: { agentId: 'general' } });

		expect(screen.getByRole('alert')).toHaveTextContent('Upstream is down');
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
