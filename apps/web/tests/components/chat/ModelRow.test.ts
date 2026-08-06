import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { tick } from 'svelte';
import { describe, expect, it, vi } from 'vitest';

import { modelDetailsStub } from '../../stubs/keys';
import { stubRenders } from '../../stubs/stub-props';
import { optionalThinking, selectableModel } from '../../helpers/models.ts';

vi.mock('../../../src/lib/components/chat/ModelDetails.svelte', async () => ({
	default: (await import('../../stubs/ModelDetailsStub.svelte')).default
}));

const Harness = (await import('./ModelRowHarness.svelte')).default;

const opus = selectableModel({
	id: 'anthropic/claude-opus-5',
	label: 'Opus 5',
	...optionalThinking
});

function renderRow(
	overrides: { pinned?: boolean; selected?: boolean; detailsOpen?: boolean } = {}
) {
	const ontogglepin = vi.fn();
	const ontoggledetails = vi.fn();
	const onselect = vi.fn();
	render(Harness, {
		props: {
			model: opus,
			selected: overrides.selected ?? false,
			pinned: overrides.pinned ?? false,
			detailsOpen: overrides.detailsOpen ?? false,
			ontogglepin,
			ontoggledetails,
			onselect
		}
	});
	return { ontogglepin, ontoggledetails, onselect };
}

describe('model row', () => {
	it('renders the model label as the option name', () => {
		renderRow();

		expect(screen.getByRole('option', { name: 'Opus 5' })).toBeInTheDocument();
	});

	it('shows the star as not pressed for an unpinned model', () => {
		renderRow();

		expect(screen.getByRole('button', { name: 'Pin Opus 5' })).toHaveAttribute(
			'aria-pressed',
			'false'
		);
	});

	it('shows the star as pressed for a pinned model', () => {
		renderRow({ pinned: true });

		expect(screen.getByRole('button', { name: 'Unpin Opus 5' })).toHaveAttribute(
			'aria-pressed',
			'true'
		);
	});

	it('calls the pin toggle when the star is clicked', async () => {
		const { ontogglepin } = renderRow();

		await userEvent.setup().click(screen.getByRole('button', { name: 'Pin Opus 5' }));

		expect(ontogglepin).toHaveBeenCalledExactlyOnceWith(opus.id);
	});

	it('calls the unpin toggle when the filled star is clicked', async () => {
		const { ontogglepin } = renderRow({ pinned: true });

		await userEvent.setup().click(screen.getByRole('button', { name: 'Unpin Opus 5' }));

		expect(ontogglepin).toHaveBeenCalledExactlyOnceWith(opus.id);
	});

	it('does not select the model when the star is clicked', async () => {
		const { onselect } = renderRow();

		await userEvent.setup().click(screen.getByRole('button', { name: 'Pin Opus 5' }));

		expect(onselect).not.toHaveBeenCalled();
	});

	it('toggles details when "More" is clicked', async () => {
		const { ontoggledetails } = renderRow();

		await userEvent.setup().click(screen.getByRole('button', { name: 'More' }));

		expect(ontoggledetails).toHaveBeenCalledExactlyOnceWith(opus.id);
	});

	it('shows "Less" when details are open', () => {
		renderRow({ detailsOpen: true });

		expect(screen.getByRole('button', { name: 'Less' })).toBeInTheDocument();
	});

	it('does not select the model when "More" is clicked', async () => {
		const { onselect } = renderRow();

		await userEvent.setup().click(screen.getByRole('button', { name: 'More' }));

		expect(onselect).not.toHaveBeenCalled();
	});

	it('hands the model to the details component', async () => {
		renderRow({ detailsOpen: true });
		await tick();

		const details = stubRenders(modelDetailsStub).find(
			// The stub records props as `unknown`; the row always passes a
			// `SelectableModel` for `model`, so the cast is sound.
			(props) => (props.model as { id: string }).id === opus.id
		);
		expect(details).toBeDefined();
		expect(details?.open).toBe(true);
	});
});
