import type { SelectableModel } from '@house-elf/shared';
import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ModelPickerTrigger } from '../../../src/lib/components/chat/ModelPickerTrigger.tsx';
import type { ProviderLogoProps } from '../../../src/lib/components/chat/ProviderLogo.tsx';
import { Dialog } from '../../../src/lib/components/ui/dialog.tsx';
import { selectableModel } from '../../helpers/models.ts';

/*
 * The logo is stubbed to record the provider it was handed: what the trigger
 * decides is which provider the selected model has, not how a logo is drawn.
 * The markup itself is covered where it already was, in ModelRow's test.
 */
let logoProps: ProviderLogoProps | undefined;
vi.mock('../../../src/lib/components/chat/ProviderLogo.tsx', () => ({
	ProviderLogo: (props: ProviderLogoProps) => {
		logoProps = props;
		return <span data-testid="provider-logo" />;
	}
}));

afterEach(() => {
	logoProps = undefined;
});

// The trigger is a dialog part, so it only renders under a dialog root.
function renderTrigger(model: SelectableModel | null) {
	render(
		<Dialog>
			<ModelPickerTrigger model={model} />
		</Dialog>
	);

	return screen.getByRole('button');
}

describe('with a model chosen', () => {
	it('shows its provider beside the name', () => {
		const trigger = renderTrigger(
			selectableModel({ id: 'anthropic/claude-opus-5', label: 'Opus 5' })
		);

		expect(trigger).toHaveTextContent('Opus 5');
		expect(screen.getByTestId('provider-logo')).toBeInTheDocument();
		expect(logoProps?.provider).toBe('anthropic');
	});

	it('strips the tilde a pointer id carries before asking for a logo', () => {
		// `~openrouter/auto` is a pointer, and the tilde is part of the id the
		// server resolves. Reading `model.provider` raw would ask models.dev for
		// `~openrouter`, which is not a provider and has no logo.
		renderTrigger(
			selectableModel({ id: '~openrouter/auto', label: 'Auto Router', isRouter: true })
		);

		expect(logoProps?.provider).toBe('openrouter');
	});

	it('names the model for assistive technology, the logo passed over', () => {
		const trigger = renderTrigger(
			selectableModel({ id: 'openai/gpt-5.3-chat', label: 'GPT-5.3 Chat' })
		);

		expect(trigger).toHaveAccessibleName('Choose model. Current model: GPT-5.3 Chat');
	});
});

describe('with none chosen yet', () => {
	it('asks for no logo, having no provider to name', () => {
		const trigger = renderTrigger(null);

		expect(screen.queryByTestId('provider-logo')).not.toBeInTheDocument();
		expect(trigger).toHaveTextContent('Choose model');
	});

	it('is still reachable and named', () => {
		const trigger = renderTrigger(null);

		expect(trigger).toHaveAccessibleName('Choose model. Current model: none');
	});
});
