import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { ModelDetails } from '../../../src/lib/components/chat/ModelDetails.tsx';
import { selectableModel } from '../../helpers/models.ts';

const withTools = selectableModel({
	id: 'anthropic/claude-opus-5',
	label: 'Claude Opus 5',
	description: 'A capable model.',
	knowledgeCutoff: '2025-08',
	inputModalities: ['text', 'image'],
	supportedParameters: ['temperature', 'reasoning', 'tools', 'reasoning_effort']
});

const withoutTools = selectableModel({
	id: 'deepseek/deepseek-chat',
	label: 'DeepSeek V4',
	description: 'Cannot call tools.',
	supportedParameters: ['temperature', 'reasoning']
});

const router = selectableModel({
	id: 'openrouter/auto',
	label: 'Auto Router',
	isRouter: true,
	pricing: { prompt: '-1', completion: '-1' }
});

function renderDetails(model = withTools, open = false) {
	return render(<ModelDetails model={model} open={open} />);
}

describe('ModelDetails', () => {
	describe('when closed', () => {
		it('renders nothing — the picker owns the More button, the details are hidden', () => {
			renderDetails();

			expect(screen.queryByText(withTools.description)).not.toBeInTheDocument();
		});
	});

	describe('the warnings row', () => {
		it('shows "Cannot call tools" as amber text for a model that cannot call tools', () => {
			renderDetails(withoutTools, true);

			const warning = screen.getByText('Cannot call tools');
			expect(warning).toBeVisible();
			expect(warning).toHaveClass('text-amber-400');
		});

		it('does not show "Cannot call tools" for a model that can call tools', () => {
			renderDetails(withTools, true);

			expect(screen.queryByText('Cannot call tools')).not.toBeInTheDocument();
		});
	});

	describe('the prose details', () => {
		it('shows the description, price, context, inputs and settings when open', () => {
			renderDetails(withTools, true);

			expect(screen.getByText(withTools.description)).toBeVisible();
			expect(screen.getByText('200,000 tokens')).toBeVisible();
			expect(screen.getByText(/from \$.* per 1M tokens/)).toBeVisible();
			expect(screen.getByText('2025-08')).toBeVisible();
			expect(screen.getByText('text, image')).toBeVisible();
			expect(screen.getByText('Temperature, Thinking, Thinking effort, Tools')).toBeVisible();
		});

		it('says "none" for settings when the model exposes none of them', () => {
			const bare = selectableModel({ supportedParameters: ['seed'] });
			renderDetails(bare, true);

			expect(screen.getByText('none')).toBeVisible();
		});

		it('says "varies" for a router rather than quoting its sentinel price', () => {
			renderDetails(router, true);

			expect(screen.getByText('Varies — set by the model the router picks')).toBeVisible();
		});

		it('omits the knowledge cutoff line when the model has none', () => {
			const noCutoff = selectableModel({ knowledgeCutoff: undefined });
			renderDetails(noCutoff, true);

			expect(screen.queryByText('Knowledge cutoff')).not.toBeInTheDocument();
		});
	});
});
