import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { CostTierFieldProps } from '../../../src/lib/components/chat/CostTierField.tsx';
import type { ReasoningFieldProps } from '../../../src/lib/components/chat/ReasoningField.tsx';
import { SettingsPicker } from '../../../src/lib/components/chat/SettingsPicker.tsx';
import type { TemperatureFieldProps } from '../../../src/lib/components/chat/TemperatureField.tsx';
import type { StoredModelSettings } from '../../../src/lib/utils/stored-model-settings.ts';
import {
	effortThinking,
	mandatoryThinking,
	routerThinking,
	selectableModel
} from '../../helpers/models.ts';

/*
 * Tested at its own boundary: the three fields are stubs that record their
 * props, because what this component decides is which of them exist for a given
 * model and what each is told — not how any of them draws. The popover and the
 * trigger are real, since "which control is reachable" is the question.
 */
let reasoningProps: ReasoningFieldProps | undefined;
vi.mock('../../../src/lib/components/chat/ReasoningField.tsx', () => ({
	ReasoningField: (props: ReasoningFieldProps) => {
		reasoningProps = props;
		return <div data-testid="reasoning-field" />;
	}
}));

let temperatureProps: TemperatureFieldProps | undefined;
vi.mock('../../../src/lib/components/chat/TemperatureField.tsx', () => ({
	TemperatureField: (props: TemperatureFieldProps) => {
		temperatureProps = props;
		return <div data-testid="temperature-field" />;
	}
}));

let costTierProps: CostTierFieldProps | undefined;
vi.mock('../../../src/lib/components/chat/CostTierField.tsx', () => ({
	CostTierField: (props: CostTierFieldProps) => {
		costTierProps = props;
		return <div data-testid="cost-tier-field" />;
	}
}));

const router = selectableModel({
	id: 'openrouter/auto',
	label: 'Auto',
	isRouter: true,
	...routerThinking
});
const thinker = selectableModel({ id: 'test/thinker', label: 'Thinker', ...effortThinking });
const free = selectableModel({
	id: 'openrouter/free',
	label: 'Free',
	isRouter: true,
	...routerThinking
});
const alwaysThinks = selectableModel({ id: 'test/always', label: 'Always', ...mandatoryThinking });
const bare = selectableModel({ id: 'test/bare', label: 'Bare', supportedParameters: [] });

afterEach(() => {
	reasoningProps = undefined;
	temperatureProps = undefined;
	costTierProps = undefined;
});

async function openPanel(
	model = router,
	stored: StoredModelSettings = {},
	{ restored = true } = {}
) {
	const user = userEvent.setup();
	const onChange = vi.fn();
	const view = render(
		<SettingsPicker model={model} onChange={onChange} restored={restored} stored={stored} />
	);

	await user.click(screen.getByRole('button'));
	await waitFor(() => {
		expect(screen.getByRole('dialog')).toBeInTheDocument();
	});

	return { user, onChange, rerender: view.rerender };
}

describe('which fields a model gets', () => {
	it('offers thinking, temperature and a cost tier on a router that takes all three', async () => {
		await openPanel();

		expect(screen.getByTestId('reasoning-field')).toBeInTheDocument();
		expect(screen.getByTestId('temperature-field')).toBeInTheDocument();
		expect(screen.getByTestId('cost-tier-field')).toBeInTheDocument();
	});

	it('offers no cost tier on a router with no documented plugin id', async () => {
		// `isRouter` is a prefix test that is true for `openrouter/free`, and the
		// server 400s a tier on anything but the two auto routers — so gating on
		// the flag would ship a control whose only effect is an error.
		await openPanel(free);

		expect(screen.queryByTestId('cost-tier-field')).not.toBeInTheDocument();
	});

	it('still shows the thinking section for a model that cannot be asked to stop', async () => {
		// A disabled on-switch with the reason spelled out, rather than nothing:
		// "you cannot turn this off" is a fact about an expensive model.
		await openPanel(alwaysThinks);

		expect(screen.getByTestId('reasoning-field')).toBeInTheDocument();
		expect(reasoningProps?.mandatory).toBe(true);
		expect(reasoningProps?.thinking).toBe(true);
		expect(reasoningProps?.efforts).toEqual([]);
	});

	it('says so plainly when there is nothing to set', async () => {
		await openPanel(bare);

		expect(screen.getByText('No settings')).toBeInTheDocument();
		expect(screen.queryByTestId('reasoning-field')).not.toBeInTheDocument();
		expect(screen.queryByTestId('temperature-field')).not.toBeInTheDocument();
	});

	it('names the model the panel is about', async () => {
		await openPanel();

		expect(screen.getByText('Auto')).toBeInTheDocument();
	});
});

describe('what each field is told', () => {
	it('hands the reasoning field the model’s own levels, ordered and cleaned', async () => {
		await openPanel(thinker, { thinking: true, effort: 'high' });

		expect(reasoningProps?.efforts).toEqual(['low', 'high']);
		expect(reasoningProps?.thinking).toBe(true);
		expect(reasoningProps?.effort).toBe('high');
	});

	it('hands it the model’s published default to rest and reset on', async () => {
		await openPanel(thinker, { thinking: true });

		expect(reasoningProps?.defaultEffort).toBe('low');
		expect(reasoningProps?.effort).toBe('low');
	});

	it('hands it OpenRouter’s documented level when the model publishes none', async () => {
		await openPanel(router, { thinking: true });

		expect(reasoningProps?.defaultEffort).toBe('medium');
		expect(reasoningProps?.effort).toBe('medium');
	});

	it('hands the temperature field no default when the model publishes none', async () => {
		await openPanel();

		expect(temperatureProps?.defaultTemperature).toBeUndefined();
		expect(temperatureProps?.temperature).toBe(1);
		expect(temperatureProps?.sendsTemperature).toBe(false);
	});

	it('hands it the published default when there is one', async () => {
		const warmed = selectableModel({ id: 'test/warm', defaultParameters: { temperature: 0.7 } });

		await openPanel(warmed);

		expect(temperatureProps?.defaultTemperature).toBe(0.7);
		expect(temperatureProps?.temperature).toBe(0.7);
	});

	it('hands the cost-tier field the chosen tier', async () => {
		await openPanel(router, { costTier: 'high' });

		expect(costTierProps?.value).toBe('high');
	});

	it('rests the cost tier on the documented default rather than on nothing', async () => {
		await openPanel(router);

		expect(costTierProps?.value).toBe('low');
	});
});

describe('changing a setting', () => {
	it('stores thinking on', async () => {
		const { onChange } = await openPanel();

		reasoningProps?.onThinkingChange(true);

		expect(onChange).toHaveBeenCalledExactlyOnceWith('thinking', true);
	});

	it('stores thinking off as absence, not as false', async () => {
		// Off is the default, so storage lists what the reader chose rather than
		// what they left alone.
		const { onChange } = await openPanel(router, { thinking: true });

		reasoningProps?.onThinkingChange(false);

		expect(onChange).toHaveBeenCalledExactlyOnceWith('thinking', undefined);
	});

	it('stores an effort the reader moved off the default', async () => {
		const { onChange } = await openPanel(thinker, { thinking: true });

		reasoningProps?.onEffortChange('high');

		expect(onChange).toHaveBeenCalledExactlyOnceWith('effort', 'high');
	});

	it('stores a return to the default as absence, not as the level itself', async () => {
		// So a reader who resets is indistinguishable from one who never moved it.
		const { onChange } = await openPanel(thinker, { thinking: true, effort: 'high' });

		reasoningProps?.onEffortChange('low');

		expect(onChange).toHaveBeenCalledExactlyOnceWith('effort', undefined);
	});

	it('stores a temperature', async () => {
		const { onChange } = await openPanel();

		temperatureProps?.onTemperatureChange(1.4);

		expect(onChange).toHaveBeenCalledExactlyOnceWith('temperature', 1.4);
	});

	it('moves only the switch when temperature is turned off, so the number survives', async () => {
		const { onChange } = await openPanel(router, { temperature: 1.6, temperatureOn: true });

		temperatureProps?.onSendTemperatureChange(false);

		expect(onChange).toHaveBeenCalledExactlyOnceWith('temperatureOn', undefined);
	});

	it('stores a cost tier', async () => {
		const { onChange } = await openPanel();

		costTierProps?.onChange('high');

		expect(onChange).toHaveBeenCalledExactlyOnceWith('costTier', 'high');
	});

	it('stores a return to the default as absence, so no tier is sent', async () => {
		const { onChange } = await openPanel(router, { costTier: 'high' });

		costTierProps?.onChange('low');

		expect(onChange).toHaveBeenCalledExactlyOnceWith('costTier', undefined);
	});
});

describe('switching models while the panel is open', () => {
	it('swaps which controls exist, in the same render', async () => {
		const { rerender } = await openPanel();
		expect(screen.getByTestId('cost-tier-field')).toBeInTheDocument();

		rerender(<SettingsPicker model={bare} onChange={vi.fn()} restored stored={{}} />);

		expect(screen.queryByTestId('cost-tier-field')).not.toBeInTheDocument();
		expect(screen.getByText('No settings')).toBeInTheDocument();
	});
});
