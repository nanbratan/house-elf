import type { SelectableModel } from '@house-elf/shared';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { PinnedSection } from '../../../src/lib/components/chat/PinnedSection.tsx';
import { Command, CommandList } from '@/registry/default/ui/command';
import { optionalThinking, selectableModel } from '../../helpers/models.ts';

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

function renderSection(
	overrides: { collapsed?: boolean; models?: readonly SelectableModel[] } = {}
) {
	const onToggleCollapsed = vi.fn();
	const onTogglePin = vi.fn();
	const onToggleDetails = vi.fn();
	const onSelect = vi.fn();

	render(
		<Command label="Models" shouldFilter={false}>
			<CommandList>
				<PinnedSection
					models={overrides.models ?? [opus, sonnet]}
					selectedModelId={opus.id}
					collapsed={overrides.collapsed ?? false}
					onToggleCollapsed={onToggleCollapsed}
					onTogglePin={onTogglePin}
					onToggleDetails={onToggleDetails}
					onSelect={onSelect}
					detailsOpenId={null}
				/>
			</CommandList>
		</Command>
	);

	return { onToggleCollapsed, onTogglePin, onToggleDetails, onSelect };
}

describe('PinnedSection', () => {
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

		// The selected model is Opus; its row renders the checkmark SVG that
		// ModelRow shows when `selected` is true. Sonnet is not selected, so its
		// row has no such SVG. This proves the section wires `selected` through
		// per row rather than dropping it.
		const opusRow = screen.getByRole('option', { name: 'Opus 5' });
		const sonnetRow = screen.getByRole('option', { name: 'Sonnet 4.5' });
		expect(opusRow.querySelector('svg.text-primary')).not.toBeNull();
		expect(sonnetRow.querySelector('svg.text-primary')).toBeNull();
	});

	it('renders a pinned (pressed) star on each row', () => {
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
		const { onToggleCollapsed } = renderSection();

		await userEvent.setup().click(screen.getByRole('button', { name: 'Pinned (2)' }));

		expect(onToggleCollapsed).toHaveBeenCalledOnce();
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
		const { onTogglePin, onSelect } = renderSection();

		await userEvent.setup().click(
			within(screen.getByRole('option', { name: 'Opus 5' })).getByRole('button', {
				name: 'Unpin Opus 5'
			})
		);

		expect(onTogglePin).toHaveBeenCalledExactlyOnceWith(opus.id);
		expect(onSelect).not.toHaveBeenCalled();
	});

	it('selects the model when the row is clicked', async () => {
		const { onSelect } = renderSection();

		await userEvent.setup().click(screen.getByRole('option', { name: 'Sonnet 4.5' }));

		expect(onSelect).toHaveBeenCalledExactlyOnceWith(sonnet.id);
	});
});
