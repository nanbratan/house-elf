import { render, screen, within } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { SelectableModel } from '@house-elf/shared';

import { optionalThinking, selectableModel } from '../../helpers/models.ts';

vi.mock('../../../src/lib/components/chat/ModelDetails.svelte', async () => ({
	default: (await import('../../stubs/ModelDetailsStub.svelte')).default
}));

const Harness = (await import('./PinnedSectionHarness.svelte')).default;

const opus = selectableModel({
	id: 'anthropic/claude-opus-5',
	label: 'Opus 5',
	...optionalThinking
});
const sonnet = selectableModel({
	id: 'anthropic/claude-sonnet-4-5',
	label: 'Sonnet 4.5',
	...optionalThinking
});

function renderSection(overrides: { collapsed?: boolean; models?: SelectableModel[] } = {}) {
	const ontogglecollapsed = vi.fn();
	const ontogglepin = vi.fn();
	const ontoggledetails = vi.fn();
	const onselect = vi.fn();
	render(Harness, {
		props: {
			models: overrides.models ?? [opus, sonnet],
			selectedModelId: opus.id,
			collapsed: overrides.collapsed ?? false,
			ontogglecollapsed,
			ontogglepin,
			ontoggledetails,
			onselect,
			detailsOpenId: null
		}
	});
	return { ontogglecollapsed, ontogglepin, ontoggledetails, onselect };
}

describe('pinned section', () => {
	it('renders the section with the pin count in the header', () => {
		renderSection();

		expect(screen.getByTestId('pinned-section')).toBeInTheDocument();
		expect(screen.getByRole('button', { name: 'Pinned (2)' })).toBeInTheDocument();
	});

	it('renders each pinned model as an option', () => {
		renderSection();

		expect(screen.getByRole('option', { name: 'Opus 5' })).toBeInTheDocument();
		expect(screen.getByRole('option', { name: 'Sonnet 4.5' })).toBeInTheDocument();
	});

	it('passes the selected id through to the row, so the selected pin shows a checkmark', () => {
		renderSection();

		// The selected model is Opus; its row renders the checkmark SVG (class
		// `text-accent`) that `ModelRow` shows when `selected` is true. Sonnet is
		// not selected, so its row has no such SVG. This proves the section wires
		// the `selected` prop to each row rather than dropping it.
		const opusRow = screen.getByRole('option', { name: 'Opus 5' });
		const sonnetRow = screen.getByRole('option', { name: 'Sonnet 4.5' });
		expect(opusRow.querySelector('svg.text-accent')).not.toBeNull();
		expect(sonnetRow.querySelector('svg.text-accent')).toBeNull();
	});

	it('renders a pinned (pressed) star on each row', () => {
		// The section always passes `pinned={true}` to its rows — this proves each
		// row receives a pressed star, which is the section's own contract. The
		// star's pressed state as such is `ModelRow`'s concern, tested in its own
		// suite; here we only confirm the section renders a star per row.
		renderSection();

		expect(
			within(screen.getByRole('option', { name: 'Opus 5' })).getByRole('button', {
				name: 'Unpin Opus 5'
			})
		).toBeInTheDocument();
		expect(
			within(screen.getByRole('option', { name: 'Sonnet 4.5' })).getByRole('button', {
				name: 'Unpin Sonnet 4.5'
			})
		).toBeInTheDocument();
	});

	it('calls the collapse toggle when the header is clicked', async () => {
		const { ontogglecollapsed } = renderSection();

		await userEvent.setup().click(screen.getByRole('button', { name: 'Pinned (2)' }));

		expect(ontogglecollapsed).toHaveBeenCalledOnce();
	});

	it('hides the pinned rows when collapsed', () => {
		renderSection({ collapsed: true });

		expect(screen.getByRole('button', { name: 'Pinned (2)' })).toBeInTheDocument();
		expect(screen.queryByRole('option')).not.toBeInTheDocument();
	});

	it('shows the header as collapsed when collapsed', () => {
		renderSection({ collapsed: true });

		expect(screen.getByRole('button', { name: 'Pinned (2)' })).toHaveAttribute(
			'aria-expanded',
			'false'
		);
	});

	it('shows the header as expanded when not collapsed', () => {
		renderSection();

		expect(screen.getByRole('button', { name: 'Pinned (2)' })).toHaveAttribute(
			'aria-expanded',
			'true'
		);
	});

	it('unpins a model when its star is clicked, and does not select it', async () => {
		const { ontogglepin, onselect } = renderSection();

		await userEvent.setup().click(
			within(screen.getByRole('option', { name: 'Opus 5' })).getByRole('button', {
				name: 'Unpin Opus 5'
			})
		);

		expect(ontogglepin).toHaveBeenCalledExactlyOnceWith(opus.id);
		expect(onselect).not.toHaveBeenCalled();
	});

	it('selects the model when the row is clicked', async () => {
		const { onselect } = renderSection();

		await userEvent.setup().click(screen.getByRole('option', { name: 'Sonnet 4.5' }));

		expect(onselect).toHaveBeenCalledExactlyOnceWith(sonnet.id);
	});
});
