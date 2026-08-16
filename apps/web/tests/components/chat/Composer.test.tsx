import { render, screen } from '@testing-library/react';
import type { ReactElement, ReactNode } from 'react';
import { cloneElement } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { Composer } from '../../../src/lib/components/chat/Composer.tsx';
import type { ModelPickerProps } from '../../../src/lib/components/chat/ModelPicker.tsx';
import type { SettingsPickerProps } from '../../../src/lib/components/chat/SettingsPicker.tsx';
import { selectableModel } from '../../helpers/models.ts';

/*
 * The draft itself belongs to assistant-ui: Enter, Shift+Enter, IME composition,
 * autosize and the empty-draft guard are `ComposerPrimitive`'s behaviour against
 * the runtime, and asserting them here would test the framework. So the
 * primitives are stubbed, and what is asserted is what Composer still decides —
 * which control the thread's running state puts in front of the reader, and the
 * contract with ModelPicker.
 */
let threadIsRunning = false;
let composerIsEmpty = true;

/*
 * The two things Composer settles that have no rendered consequence a query can
 * reach: what it configures the input with, and what it tells the send button
 * about emptiness. Recorded here and read back, the way ModelPicker's props are.
 */
interface ComposerInputProps {
	'aria-label'?: string;
	placeholder?: string;
	rows?: number;
	cancelOnEscape?: boolean;
}
let inputProps: ComposerInputProps | undefined;
let sendIdle: boolean | undefined;

vi.mock('@assistant-ui/react', () => ({
	useAuiState: vi.fn((select: (state: { composer: { isEmpty: boolean } }) => unknown) =>
		select({ composer: { isEmpty: composerIsEmpty } })
	),
	AuiIf: vi.fn(
		({
			condition,
			children
		}: {
			condition: (state: { thread: { isRunning: boolean } }) => boolean;
			children?: ReactNode;
		}) => (condition({ thread: { isRunning: threadIsRunning } }) ? <div>{children}</div> : null)
	),
	ComposerPrimitive: {
		Root: vi.fn(({ children, ...props }: { children?: ReactNode }) => (
			<div {...props}>{children}</div>
		)),
		// Only the accessible name and the placeholder are carried over to the DOM:
		// the rest of what the real Input takes is its own behaviour, not a textarea
		// attribute, so it is recorded instead of rendered.
		Input: vi.fn((props: ComposerInputProps) => {
			inputProps = props;
			return <textarea aria-label={props['aria-label']} placeholder={props.placeholder} />;
		}),
		// Both render their button through `render`, the way the real primitive
		// hands its own props to that element via Radix's Slot.
		Send: vi.fn(({ render: element, ...props }: { render: ReactElement<{ idle: boolean }> }) => {
			sendIdle = element.props.idle;
			return cloneElement(element, props);
		}),
		Cancel: vi.fn(({ render: element, ...props }: { render: ReactElement }) =>
			cloneElement(element, props)
		)
	}
}));

/*
 * ModelPicker has its own test; here it is a stub that records its props and
 * renders a bare marker, so only the contract between the two is asserted. To
 * drive a callback, the recorded props are read back and invoked directly.
 */
let modelPickerProps: ModelPickerProps | undefined;
vi.mock('../../../src/lib/components/chat/ModelPicker.tsx', () => ({
	ModelPicker: (props: ModelPickerProps) => {
		modelPickerProps = props;
		return <div data-testid="model-picker" />;
	}
}));

/* The second trigger, stubbed on the same terms as the first. */
let settingsPickerProps: SettingsPickerProps | undefined;
vi.mock('../../../src/lib/components/chat/SettingsPicker.tsx', () => ({
	SettingsPicker: (props: SettingsPickerProps) => {
		settingsPickerProps = props;
		return <div data-testid="settings-picker" />;
	}
}));

const model = selectableModel({ id: 'test/model', label: 'Test Model' });
const models = [model];
const storedSettings = { thinking: true } as const;

function renderComposer() {
	const onModelSelect = vi.fn();
	const onSettingChange = vi.fn();

	render(
		<Composer
			models={models}
			onModelSelect={onModelSelect}
			onSettingChange={onSettingChange}
			selectedModel={model}
			settingsRestored
			storedSettings={storedSettings}
		/>
	);

	return { onModelSelect, onSettingChange };
}

describe('Composer', () => {
	beforeEach(() => {
		threadIsRunning = false;
		composerIsEmpty = true;
		modelPickerProps = undefined;
		settingsPickerProps = undefined;
		inputProps = undefined;
		sendIdle = undefined;
	});

	it('offers a message box the reader can find by name', () => {
		renderComposer();

		expect(screen.getByRole('textbox', { name: 'Message' })).toBeInTheDocument();
	});

	describe('how the input is configured', () => {
		// A textarea defaults to two rows, so the server sends a box twice the height
		// autosize settles on, and the whole composer jumps on hydration.
		it('opens at the one row it will settle at, so nothing jumps on hydration', () => {
			renderComposer();

			expect(inputProps?.rows).toBe(1);
		});

		// `canCancel` is permanently true for this runtime, so the primitive's default
		// would let Escape abort a reply that is still arriving.
		it('leaves Escape alone, so it cannot abort a running turn', () => {
			renderComposer();

			expect(inputProps?.cancelOnEscape).toBe(false);
		});
	});

	describe('the send button’s resting state', () => {
		it.each([
			{ isEmpty: true, idle: true, when: 'there is nothing to send' },
			{ isEmpty: false, idle: false, when: 'a draft is waiting' }
		])('is idle=$idle when $when', ({ isEmpty, idle }) => {
			composerIsEmpty = isEmpty;

			renderComposer();

			expect(sendIdle).toBe(idle);
		});
	});

	describe('while the thread is idle', () => {
		it('offers Send, and no way to stop what is not running', () => {
			renderComposer();

			expect(screen.getByRole('button', { name: 'Send message' })).toBeInTheDocument();
			expect(screen.queryByRole('button', { name: 'Stop generating' })).not.toBeInTheDocument();
		});
	});

	describe('while a reply is arriving', () => {
		it('swaps Send for Stop', () => {
			threadIsRunning = true;

			renderComposer();

			expect(screen.getByRole('button', { name: 'Stop generating' })).toBeInTheDocument();
			expect(screen.queryByRole('button', { name: 'Send message' })).not.toBeInTheDocument();
		});
	});

	describe('model picker contract', () => {
		it('passes the catalog and selected id down, and passes selections back up', () => {
			const { onModelSelect } = renderComposer();

			expect(modelPickerProps?.models).toBe(models);
			expect(modelPickerProps?.selectedModelId).toBe('test/model');

			modelPickerProps?.onSelect('other/model');

			expect(onModelSelect).toHaveBeenCalledExactlyOnceWith('other/model');
		});

		it('leaves every setting to the other trigger', () => {
			// The model picker is a list the reader scans by name; it stopped being a
			// form in T1.7.8, and a setting creeping back would make it one again.
			renderComposer();

			expect(Object.keys(modelPickerProps ?? {}).sort()).toEqual([
				'models',
				'onSelect',
				'selectedModelId'
			]);
		});
	});

	describe('settings picker contract', () => {
		it('passes the selected model and its stored settings down', () => {
			renderComposer();

			// The whole model, not just the id: which controls exist is read from it.
			expect(settingsPickerProps?.model).toBe(model);
			expect(settingsPickerProps?.stored).toBe(storedSettings);
			expect(settingsPickerProps?.restored).toBe(true);
		});

		it('passes a changed setting back up', () => {
			const { onSettingChange } = renderComposer();

			settingsPickerProps?.onChange('effort', 'high');

			expect(onSettingChange).toHaveBeenCalledExactlyOnceWith('effort', 'high');
		});
	});
});
