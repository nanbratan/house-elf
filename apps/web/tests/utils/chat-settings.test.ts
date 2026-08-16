import type { SelectableModel } from '@house-elf/shared';
import { describe, expect, it } from 'vitest';

import {
	effortThinking,
	mandatoryThinking,
	routerThinking,
	selectableModel
} from '../helpers/models.ts';

const plain = selectableModel({ id: 'test/plain' });
const thinker = selectableModel({ id: 'test/thinker', ...effortThinking });
const alwaysThinks = selectableModel({ id: 'test/always', ...mandatoryThinking });
const router = selectableModel({ id: 'openrouter/auto', isRouter: true, ...routerThinking });
const warmed = selectableModel({ id: 'test/warmed', defaultParameters: { temperature: 0.7 } });

import { chatSettingsFor } from '../../src/lib/utils/chat-settings.ts';
import { modelCapabilities } from '../../src/lib/utils/model-capabilities.ts';
import { resolveSettings } from '../../src/lib/utils/model-settings.ts';
import type { StoredModelSettings } from '../../src/lib/utils/stored-model-settings.ts';

/** What ChatView builds: capabilities, resolved once, then the wire object. */
function wire(model: SelectableModel, stored: StoredModelSettings) {
	return chatSettingsFor(model.id, resolveSettings(modelCapabilities(model), stored));
}

describe('chatSettingsFor', () => {
	it('says thinking is off out loud rather than leaving it unsaid', () => {
		// A model of the Claude 5 class thinks unless told not to, so silence would
		// hand it a default the reader never chose.
		expect(wire(thinker, {})).toEqual({
			model: 'test/thinker',
			reasoning: { mode: 'off' }
		});
	});

	it('sends off for a model that cannot think at all', () => {
		expect(wire(plain, {})).toEqual({ model: 'test/plain', reasoning: { mode: 'off' } });
	});

	it('never sends off for a model that always thinks', () => {
		// The server refuses that by design; its arrival would mean the panel
		// offered an off switch it should have disabled.
		expect(wire(alwaysThinks, {})).toEqual({
			model: 'test/always',
			reasoning: { mode: 'on' }
		});
	});

	it('omits the level the model would have used anyway', () => {
		// Shown as selected, but not worth a field on the wire.
		expect(wire(thinker, { thinking: true })).toEqual({
			model: 'test/thinker',
			reasoning: { mode: 'on' }
		});
	});

	it('carries a level the reader chose', () => {
		expect(wire(thinker, { thinking: true, effort: 'high' })).toEqual({
			model: 'test/thinker',
			reasoning: { mode: 'on', effort: 'high' }
		});
	});

	it('omits an untouched temperature', () => {
		expect(wire(warmed, {})).not.toHaveProperty('temperature');
	});

	it('carries a temperature the reader moved off the default', () => {
		expect(wire(warmed, { temperature: 1.2 })).toEqual({
			model: 'test/warmed',
			reasoning: { mode: 'off' },
			temperature: 1.2
		});
	});

	it('omits the cost tier while the router is left to choose', () => {
		// Sending nothing is exactly what "let the router pick" asks for.
		expect(wire(router, {})).not.toHaveProperty('costTier');
	});

	it('carries a router’s thinking, level and cost tier at once', () => {
		expect(wire(router, { thinking: true, effort: 'low', costTier: 'high' })).toEqual({
			model: 'openrouter/auto',
			reasoning: { mode: 'on', effort: 'low' },
			costTier: 'high'
		});
	});

	it('omits a cost tier stored against a model that would be refused it', () => {
		expect(wire(plain, { costTier: 'low' })).not.toHaveProperty('costTier');
	});

	it('never sends a seed', () => {
		// The server still accepts one; this client simply never names it.
		expect(wire(warmed, { temperature: 1.2 })).not.toHaveProperty('seed');
	});
});
