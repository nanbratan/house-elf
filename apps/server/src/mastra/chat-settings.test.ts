import type { ChatSettings, SelectableModel } from '@house-elf/shared';
import { REASONING_MODE } from '@house-elf/shared';
import { describe, expect, it } from 'vitest';

import { UnsupportedSettingError, chatSettingsProviderOptions } from './chat-settings.ts';

/** This module reads nothing from a model but `id`, `supportedParameters` and `reasoning`. */
function modelWith(
	supportedParameters: string[],
	options: { id?: string; reasoning?: SelectableModel['reasoning'] } = {}
): SelectableModel {
	return {
		id: options.id ?? 'test/model',
		supportedParameters,
		reasoning: options.reasoning
	} as SelectableModel;
}

function settingsWith(settings: Partial<ChatSettings>): ChatSettings {
	return { model: 'test/model', reasoning: { mode: REASONING_MODE.off }, ...settings };
}

const thinks = modelWith(['reasoning', 'reasoning_effort'], {
	reasoning: { mandatory: false, supportedEfforts: ['low', 'high'] }
});
const onOffOnly = modelWith(['reasoning'], { reasoning: { mandatory: false } });
const mandatory = modelWith(['reasoning', 'reasoning_effort'], {
	reasoning: { mandatory: true, supportedEfforts: ['low', 'high'] }
});
const cannotThink = modelWith(['temperature']);
/** `openrouter/auto`: advertises the effort parameter, publishes no reasoning. */
const router = modelWith(['reasoning', 'reasoning_effort'], { id: 'openrouter/auto' });

const on = { mode: REASONING_MODE.on } as const;
const off = { mode: REASONING_MODE.off } as const;

/** Sent whatever the reader chose, so it appears in every expectation below. */
const COMPRESSION_OFF = { id: 'context-compression', enabled: false };

describe('reasoning', () => {
	it('states thinking-off out loud rather than omitting it', () => {
		// Claude-class models think unless told not to.
		expect(chatSettingsProviderOptions(thinks, settingsWith({ reasoning: off }))).toEqual({
			openrouter: { plugins: [COMPRESSION_OFF], reasoning: { enabled: false } }
		});
	});

	it('asks for thinking without naming an effort the reader did not choose', () => {
		expect(chatSettingsProviderOptions(thinks, settingsWith({ reasoning: on }))).toEqual({
			openrouter: { plugins: [COMPRESSION_OFF], reasoning: { enabled: true } }
		});
	});

	it('carries an effort the model publishes', () => {
		expect(
			chatSettingsProviderOptions(
				thinks,
				settingsWith({ reasoning: { mode: REASONING_MODE.on, effort: 'high' } })
			)
		).toEqual({
			openrouter: { plugins: [COMPRESSION_OFF], reasoning: { enabled: true, effort: 'high' } }
		});
	});

	it('refuses an effort outside the ones the model publishes', () => {
		expect(() =>
			chatSettingsProviderOptions(
				thinks,
				settingsWith({ reasoning: { mode: REASONING_MODE.on, effort: 'max' } })
			)
		).toThrow(UnsupportedSettingError);
	});

	it('refuses an effort on a model that takes no effort level', () => {
		expect(() =>
			chatSettingsProviderOptions(
				onOffOnly,
				settingsWith({ reasoning: { mode: REASONING_MODE.on, effort: 'high' } })
			)
		).toThrow(UnsupportedSettingError);
	});

	it("accepts one of OpenRouter's own levels on a router, which publishes none", () => {
		expect(
			chatSettingsProviderOptions(
				router,
				settingsWith({ reasoning: { mode: REASONING_MODE.on, effort: 'xhigh' } })
			)
		).toEqual({
			openrouter: { plugins: [COMPRESSION_OFF], reasoning: { enabled: true, effort: 'xhigh' } }
		});
	});

	it('refuses an effort OpenRouter does not define', () => {
		expect(() =>
			chatSettingsProviderOptions(
				router,
				settingsWith({ reasoning: { mode: REASONING_MODE.on, effort: 'ludicrous' } })
			)
		).toThrow(UnsupportedSettingError);
	});

	describe("a model that publishes the effort 'none'", () => {
		const publishesNone = modelWith(['reasoning', 'reasoning_effort'], {
			reasoning: { mandatory: false, supportedEfforts: ['low', 'high', 'none'] }
		});

		it("refuses 'none', which is reasoning off said a second way", () => {
			expect(() =>
				chatSettingsProviderOptions(
					publishesNone,
					settingsWith({ reasoning: { mode: REASONING_MODE.on, effort: 'none' } })
				)
			).toThrow(UnsupportedSettingError);
		});

		it("does not offer 'none' as a level the caller could have used", () => {
			// The refusal names what to send instead, so listing a level that is
			// itself refused sends the reader round the loop again.
			expect(() =>
				chatSettingsProviderOptions(
					publishesNone,
					settingsWith({ reasoning: { mode: REASONING_MODE.on, effort: 'ludicrous' } })
				)
			).toThrow('it accepts low, high.');
		});
	});

	it('asks a mandatory-reasoning model to think, so an effort still reaches it', () => {
		expect(
			chatSettingsProviderOptions(
				mandatory,
				settingsWith({ reasoning: { mode: REASONING_MODE.on, effort: 'low' } })
			)
		).toEqual({
			openrouter: { plugins: [COMPRESSION_OFF], reasoning: { enabled: true, effort: 'low' } }
		});
	});

	it('refuses to switch off a model that always thinks', () => {
		// The picker hides that option, so the request is a bug rather than a choice.
		expect(() => chatSettingsProviderOptions(mandatory, settingsWith({ reasoning: off }))).toThrow(
			UnsupportedSettingError
		);
	});

	it('refuses to ask a model that cannot think', () => {
		expect(() => chatSettingsProviderOptions(cannotThink, settingsWith({ reasoning: on }))).toThrow(
			UnsupportedSettingError
		);
	});

	it('names no reasoning for a model that cannot think and was not asked to', () => {
		expect(chatSettingsProviderOptions(cannotThink, settingsWith({ reasoning: off }))).toEqual({
			openrouter: { plugins: [COMPRESSION_OFF] }
		});
	});
});

describe('sampling settings', () => {
	const samples = modelWith(['reasoning', 'temperature', 'seed'], {
		reasoning: { mandatory: false }
	});

	it('carries a temperature the model accepts', () => {
		expect(chatSettingsProviderOptions(samples, settingsWith({ temperature: 0.5 }))).toEqual({
			openrouter: { plugins: [COMPRESSION_OFF], reasoning: { enabled: false }, temperature: 0.5 }
		});
	});

	it('refuses a temperature on a model that ignores sampling parameters', () => {
		// Claude Sonnet 5 is exactly this: it does not advertise `temperature`.
		expect(() =>
			chatSettingsProviderOptions(onOffOnly, settingsWith({ temperature: 0.5 }))
		).toThrow(UnsupportedSettingError);
	});

	it('carries a seed the model accepts', () => {
		expect(chatSettingsProviderOptions(samples, settingsWith({ seed: 7 }))).toEqual({
			openrouter: { plugins: [COMPRESSION_OFF], reasoning: { enabled: false }, seed: 7 }
		});
	});

	it('refuses a seed on a model that cannot sample deterministically', () => {
		expect(() => chatSettingsProviderOptions(onOffOnly, settingsWith({ seed: 7 }))).toThrow(
			UnsupportedSettingError
		);
	});

	it('leaves out every setting the reader did not name', () => {
		// The acceptance criterion most likely to regress: absent must reach the
		// provider as absent, never as a default this server invented.
		expect(chatSettingsProviderOptions(samples, settingsWith({ reasoning: on }))).toEqual({
			openrouter: { plugins: [COMPRESSION_OFF], reasoning: { enabled: true } }
		});
	});

	it('carries every setting at once, each under its own key', () => {
		const everything = modelWith(['reasoning', 'reasoning_effort', 'temperature', 'seed'], {
			id: 'openrouter/auto-beta',
			reasoning: { mandatory: false, supportedEfforts: ['low', 'high'] }
		});

		expect(
			chatSettingsProviderOptions(
				everything,
				settingsWith({
					reasoning: { mode: REASONING_MODE.on, effort: 'high' },
					temperature: 0.5,
					seed: 7,
					costTier: 'low'
				})
			)
		).toEqual({
			openrouter: {
				reasoning: { enabled: true, effort: 'high' },
				temperature: 0.5,
				seed: 7,
				plugins: [COMPRESSION_OFF, { id: 'auto-beta-router', cost_tier: 'low' }]
			}
		});
	});
});

describe('cost tier', () => {
	const auto = modelWith([], { id: 'openrouter/auto' });
	const autoBeta = modelWith([], { id: 'openrouter/auto-beta' });
	const free = modelWith([], { id: 'openrouter/free' });

	it('routes openrouter/auto under its own plugin id', () => {
		expect(chatSettingsProviderOptions(auto, settingsWith({ costTier: 'low' }))).toEqual({
			openrouter: { plugins: [COMPRESSION_OFF, { id: 'auto-router', cost_tier: 'low' }] }
		});
	});

	it('routes openrouter/auto-beta under a different plugin id', () => {
		// Each slug reads only its own id, and ignores the other's in silence — so
		// the wrong id here is a cost tier that appears to work and does nothing.
		expect(chatSettingsProviderOptions(autoBeta, settingsWith({ costTier: 'max' }))).toEqual({
			openrouter: { plugins: [COMPRESSION_OFF, { id: 'auto-beta-router', cost_tier: 'max' }] }
		});
	});

	it('refuses a cost tier on a router with no plugin id of its own', () => {
		expect(() => chatSettingsProviderOptions(free, settingsWith({ costTier: 'low' }))).toThrow(
			UnsupportedSettingError
		);
	});

	it('keeps compression switched off alongside the tier it routes through', () => {
		// Both write to one array, so a contributor that assigned rather than
		// appended would drop the other — and what goes missing is the off-switch.
		const plugins = chatSettingsProviderOptions(auto, settingsWith({ costTier: 'low' })).openrouter
			.plugins;

		expect(plugins).toContainEqual(COMPRESSION_OFF);
	});
});

describe('context compression', () => {
	const plain = modelWith([]);

	it('switches compression off on a request that named no settings at all', () => {
		// Omitting it is not neutral: OpenRouter compresses by default below 8k.
		expect(chatSettingsProviderOptions(plain, settingsWith({}))).toEqual({
			openrouter: { plugins: [{ id: 'context-compression', enabled: false }] }
		});
	});
});
