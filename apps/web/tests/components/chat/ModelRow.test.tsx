import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { ModelRow } from '../../../src/lib/components/chat/ModelRow.tsx';
import { Combobox, ComboboxList } from '../../../src/lib/components/ui/combobox.tsx';
import { optionalThinking, selectableModel } from '../../helpers/models.ts';

const opus = selectableModel({
	id: 'anthropic/claude-opus-5',
	label: 'Opus 5',
	...optionalThinking
});

/**
 * Selection is the root's to commit, not the row's — the row has no `onSelect`
 * of its own — so a test that asks whether the model got chosen watches
 * `onValueChange` here.
 */
function renderRow(
	overrides: { pinned?: boolean; selected?: boolean; detailsOpen?: boolean } = {}
) {
	const onTogglePin = vi.fn();
	const onToggleDetails = vi.fn();
	const onValueChange = vi.fn();

	render(
		<Combobox inline open items={[opus]} onValueChange={onValueChange}>
			<ComboboxList>
				<ModelRow
					model={opus}
					selected={overrides.selected ?? false}
					pinned={overrides.pinned ?? false}
					detailsOpen={overrides.detailsOpen ?? false}
					index={0}
					listedCount={1}
					onTogglePin={onTogglePin}
					onToggleDetails={onToggleDetails}
				/>
			</ComboboxList>
		</Combobox>
	);

	return { onTogglePin, onToggleDetails, onValueChange };
}

describe('ModelRow', () => {
	it('renders the model label as the option name', () => {
		renderRow();

		expect(screen.getByRole('option', { name: 'Opus 5' })).toBeInTheDocument();
	});

	it('states its own place in the list, which has no groups to state it', () => {
		renderRow();

		const row = screen.getByRole('option', { name: 'Opus 5' });

		expect(row).toHaveAttribute('aria-posinset', '1');
		expect(row).toHaveAttribute('aria-setsize', '1');
	});

	/**
	 * The row's own `aria-label` pins the option's accessible name to the model
	 * label, so nothing else here notices whether the logo rendered at all. The
	 * name, not the URL: the source of the image is due to move to a local path.
	 */
	it('names the provider logo for assistive tech', () => {
		renderRow();

		expect(screen.getByRole('img', { name: 'anthropic logo' })).toBeInTheDocument();
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
		const { onTogglePin } = renderRow();

		await userEvent.setup().click(screen.getByRole('button', { name: 'Pin Opus 5' }));

		expect(onTogglePin).toHaveBeenCalledExactlyOnceWith(opus.id);
	});

	it('calls the unpin toggle when the filled star is clicked', async () => {
		const { onTogglePin } = renderRow({ pinned: true });

		await userEvent.setup().click(screen.getByRole('button', { name: 'Unpin Opus 5' }));

		expect(onTogglePin).toHaveBeenCalledExactlyOnceWith(opus.id);
	});

	it('does not select the model when the star is clicked', async () => {
		const { onValueChange } = renderRow();

		await userEvent.setup().click(screen.getByRole('button', { name: 'Pin Opus 5' }));

		expect(onValueChange).not.toHaveBeenCalled();
	});

	it('toggles details when "More" is clicked', async () => {
		const { onToggleDetails } = renderRow();

		await userEvent.setup().click(screen.getByRole('button', { name: 'More' }));

		expect(onToggleDetails).toHaveBeenCalledExactlyOnceWith(opus.id);
	});

	it('shows "Less" when details are open', () => {
		renderRow({ detailsOpen: true });

		expect(screen.getByRole('button', { name: 'Less' })).toBeInTheDocument();
	});

	it('does not select the model when "More" is clicked', async () => {
		const { onValueChange } = renderRow();

		await userEvent.setup().click(screen.getByRole('button', { name: 'More' }));

		expect(onValueChange).not.toHaveBeenCalled();
	});

	it('shows the model description once details are open', () => {
		renderRow({ detailsOpen: true });

		expect(screen.getByText(opus.description)).toBeVisible();
	});

	it('selects the model when the row itself is clicked', async () => {
		const { onValueChange } = renderRow();

		await userEvent.setup().click(screen.getByRole('option', { name: 'Opus 5' }));

		expect(onValueChange).toHaveBeenCalledOnce();
		expect(onValueChange.mock.calls[0]?.[0]).toEqual(opus);
	});
});
