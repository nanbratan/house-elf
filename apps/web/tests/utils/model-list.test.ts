import { describe, expect, it } from 'vitest';

import { providerName, releaseSections, searchSections } from '../../src/lib/utils/model-list.ts';
import { selectableModel } from '../helpers/models.ts';

const opus = selectableModel({
	id: 'anthropic/claude-opus-5',
	label: 'Opus 5',
	createdAt: Date.UTC(2026, 7, 3)
});
const sonnet = selectableModel({
	id: 'anthropic/claude-sonnet-4-5',
	label: 'Sonnet 4.5',
	createdAt: Date.UTC(2026, 6, 20)
});
const gpt = selectableModel({
	id: 'openai/gpt-5.3-chat',
	label: 'GPT-5.3 Chat',
	createdAt: Date.UTC(2026, 6, 2)
});
const auto = selectableModel({
	id: 'openrouter/auto',
	label: 'Auto Router',
	isRouter: true,
	createdAt: Date.UTC(2025, 0, 1)
});

const catalog = [gpt, opus, auto, sonnet];

/** What the list looks like from outside: headers, and what sits under each. */
function shape(sections: readonly { title: string; models: readonly { label: string }[] }[]) {
	return sections.map(({ title, models }) => [title, models.map((model) => model.label)]);
}

describe('the picker list', () => {
	it('groups models by release month, newest month first', () => {
		expect(shape(releaseSections([gpt, opus, sonnet]))).toEqual([
			['August 2026', ['Opus 5']],
			['July 2026', ['Sonnet 4.5', 'GPT-5.3 Chat']]
		]);
	});

	it('puts routers above the months, out of the release order entirely', () => {
		// The router is the oldest entry here, so month order alone would bury it —
		// and it is the model a first visit starts on.
		const [first, ...rest] = releaseSections(catalog);

		expect(first.title).toBe('Routers');
		expect(first.models).toEqual([auto]);
		expect(rest.map((section) => section.title)).toEqual(['August 2026', 'July 2026']);
	});

	it('has no routers section when the catalog holds none', () => {
		expect(releaseSections([gpt, opus]).map((section) => section.title)).toEqual([
			'August 2026',
			'July 2026'
		]);
	});

	it('leaves the caller\u2019s catalog as it found it', () => {
		const given = [gpt, opus, auto, sonnet];

		releaseSections(given);

		expect(given).toEqual([gpt, opus, auto, sonnet]);
	});
});

describe('searching the picker', () => {
	it('collapses to a single ranked list', () => {
		expect(shape(searchSections(catalog, 'o'))).toEqual([
			['Best matches', ['Opus 5', 'Auto Router', 'Sonnet 4.5']]
		]);
	});

	it('ranks a label the query starts above a label that merely contains it', () => {
		const [matches] = searchSections([sonnet, opus], 'o');

		expect(matches.models.map((model) => model.label)).toEqual(['Opus 5', 'Sonnet 4.5']);
	});

	it('matches the label only, never the provider behind it', () => {
		// `openai` is GPT's provider and appears in no label. Provider is a filter of
		// its own, not a second meaning for the search box.
		expect(searchSections([gpt, opus, sonnet], 'anthropic')).toEqual([]);
	});

	it('matches whatever the reader typed, in any case, padded or not', () => {
		const [matches] = searchSections([gpt, opus], '  OPUS ');

		expect(matches.models).toEqual([opus]);
	});

	it('has nothing to show for a query nothing answers', () => {
		expect(searchSections(catalog, 'nothing named this')).toEqual([]);
	});
});

describe('the provider a model is read as belonging to', () => {
	it('is the slug of an ordinary id', () => {
		expect(providerName(selectableModel({ id: 'anthropic/claude-opus-5' }))).toBe('anthropic');
	});

	it('drops the tilde a pointer carries, for reading only', () => {
		const pointer = selectableModel({ id: '~anthropic/claude-opus-latest' });

		expect(providerName(pointer)).toBe('anthropic');
		// The tilde is part of the id and must survive being displayed next to a
		// stripped copy of itself: without it, OpenRouter has no such model.
		expect(pointer.id).toBe('~anthropic/claude-opus-latest');
	});
});
