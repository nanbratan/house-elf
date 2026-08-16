import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { SettingsPickerTrigger } from '../../../src/lib/components/chat/SettingsPickerTrigger.tsx';
import { Popover } from '../../../src/lib/components/ui/popover.tsx';
import type { SettingsSummary } from '../../../src/lib/utils/settings-summary.ts';

// The trigger is a popover part, so it only renders under a popover root.
function renderTrigger(restored: boolean, summary: SettingsSummary) {
	render(
		<Popover>
			<SettingsPickerTrigger restored={restored} summary={summary} />
		</Popover>
	);

	return screen.getByRole('button');
}

describe('before the restore lands', () => {
	it('shows a placeholder rather than a word it would have to take back', () => {
		// The client does not yet know whether this model has settings, so `Settings`
		// would be wrong for anyone who had set something — and correcting it would
		// shift the toolbar.
		const trigger = renderTrigger(false, { tokens: ['Thinking high'], label: 'Settings: …' });

		expect(trigger).toHaveTextContent('');
		expect(trigger.querySelector('[data-slot="skeleton"]')).toBeInTheDocument();
	});

	it('is still reachable and named', () => {
		const trigger = renderTrigger(false, { tokens: [], label: 'Settings' });

		expect(trigger).toHaveAccessibleName('Settings');
	});
});

describe('once it lands', () => {
	it('says only the word when nothing is set', () => {
		const trigger = renderTrigger(true, { tokens: [], label: 'Settings' });

		expect(trigger).toHaveTextContent('Settings');
		expect(trigger.querySelector('[data-slot="skeleton"]')).not.toBeInTheDocument();
	});

	it('shows each token it was given', () => {
		const trigger = renderTrigger(true, {
			tokens: ['Thinking high', 'Cost high'],
			label: 'Settings: thinking on at high effort, cost tier high'
		});

		expect(trigger).toHaveTextContent('Thinking high');
		expect(trigger).toHaveTextContent('Cost high');
	});

	it('spells the full list out for a screen reader, not the tokens', () => {
		// The tokens are capped to keep the trigger legible on a phone; the
		// accessible name is not, so nothing is lost to anyone who cannot see them.
		const trigger = renderTrigger(true, {
			tokens: ['Thinking low', 'Cost low', '+1'],
			label: 'Settings: thinking on at low effort, cost tier low, temperature 1.4'
		});

		expect(trigger).toHaveAccessibleName(
			'Settings: thinking on at low effort, cost tier low, temperature 1.4'
		);
	});
});
