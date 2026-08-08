import type { SelectableModel } from '@house-elf/shared';

/**
 * A warning that renders on the always-visible info row, above the collapsible.
 *
 * Warnings are facts that change what happens, not facts that describe the
 * model — so they earn a permanent line where descriptive facts (thinking,
 * temperature, context, free) do not. Those are already in the collapsible's
 * settings list, context line, and price; repeating them on the row is noise.
 */
export interface ModelWarning {
	readonly id: string;
	/** What the reader sees and a screen reader hears. */
	readonly label: string;
}

/** A capability the app exposes, for the details list. */
export interface SettingCapability {
	readonly id: string;
	readonly label: string;
}

/**
 * The capabilities the settings panel (T1.7.8) can act on — the same list the
 * filter row uses, kept here so the details a row advertises match what the
 * settings picker would actually show for that model.
 */
const settingCapabilities: readonly SettingCapability[] = [
	{ id: 'temperature', label: 'Temperature' },
	{ id: 'reasoning', label: 'Thinking' },
	{ id: 'reasoning_effort', label: 'Thinking effort' },
	{ id: 'tools', label: 'Tools' },
	{ id: 'verbosity', label: 'Verbosity' }
];

function supports(model: SelectableModel, parameter: string): boolean {
	return model.supportedParameters.includes(parameter);
}

/**
 * The warnings that render on a model's always-visible info row.
 *
 * "Cannot call tools" is the one warning today: a model without `tools` will
 * fail any tool call the agent attempts, and the app already ships a tool, so
 * picking one of those silently breaks it. It is shown only when the model
 * lacks `tools` — a model that has `tools` has nothing to warn about.
 */
export function warnings(model: SelectableModel): readonly ModelWarning[] {
	const list: ModelWarning[] = [];

	if (!supports(model, 'tools')) {
		list.push({ id: 'no-tools', label: 'Cannot call tools' });
	}

	return list;
}

/** The capabilities the settings panel can act on, for the details list. */
export function settingList(model: SelectableModel): readonly string[] {
	return settingCapabilities
		.filter((capability) => supports(model, capability.id))
		.map((capability) => capability.label);
}

/**
 * Price as dollars per million tokens, for the details prose.
 *
 * Routers price as the sentinel `"-1"` — "billed at whatever the chosen model
 * costs" — so they render as "varies" rather than as a negative number.
 *
 * The schema carries only `prompt` and `completion`, not `pricing.overrides`
 * (volume tiering, present on 44 of 337 models). A tiered model's headline is a
 * floor, not an exact price, but the picker cannot detect tiering from what the
 * schema exposes — so the label reads "from" unconditionally, which is honest
 * for the tiered 44 and merely cautious for the rest. Adding `overrides` to the
 * schema is a T1.7.1b/T1.7.2 concern, not this slice's.
 */
export function priceLabel(model: SelectableModel): string {
	if (model.isRouter) return 'Varies — set by the model the router picks';

	const prompt = (Number(model.pricing.prompt) * 1_000_000).toFixed(2);
	const completion = (Number(model.pricing.completion) * 1_000_000).toFixed(2);
	return `from $${prompt} / $${completion} per 1M tokens`;
}
