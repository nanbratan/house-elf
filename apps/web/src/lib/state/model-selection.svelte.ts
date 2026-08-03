import type { ModelCatalog, SelectableModel } from '@house-elf/shared';
import { onMount } from 'svelte';

const modelStorageKey = 'house-elf:selected-model';
const thinkingStorageKey = 'house-elf:thinking';

type ModelSelectionStorage = Pick<Storage, 'getItem' | 'setItem'>;

export interface ModelSelection {
	readonly selectedModelId: string;
	readonly selectedModel: SelectableModel;
	/** Whether the next message should ask the model to think. */
	readonly thinking: boolean;
	/** Whether thinking is the reader's to decide for the current model. */
	readonly canChooseThinking: boolean;
	select(modelId: string): void;
	setThinking(thinking: boolean): void;
}

/**
 * Owns the reader's model choice and whether the next message asks for
 * thinking, and restores both after hydration.
 *
 * The two live together because they are not independent: a model that cannot
 * be asked to think has to force the flag off, and choosing a model is the
 * moment that happens. Switching away and back does not bring thinking back —
 * an unasked-for expensive request is worse than an extra click.
 *
 * Production storage is attached in `onMount` so the server and first browser
 * render agree. Tests may supply the real jsdom storage directly and exercise
 * the state without a component harness.
 */
export function createModelSelection(
	catalog: ModelCatalog,
	initialStorage?: ModelSelectionStorage
): ModelSelection {
	let storage = initialStorage;
	let selectedModelId = $state(catalog.initialModelId);
	let thinking = $state(false);

	function modelFor(modelId: string): SelectableModel {
		// The catalog is validated to contain its own initial model, so the
		// fallback is unreachable rather than a guess at a default.
		return catalog.models.find((model) => model.id === modelId) ?? catalog.models[0];
	}

	function restore(): void {
		const storedModelId = storage?.getItem(modelStorageKey);
		if (
			storedModelId !== null &&
			storedModelId !== undefined &&
			catalog.models.some((model) => model.id === storedModelId)
		) {
			selectedModelId = storedModelId;
		}

		// Read after the model, because the model decides whether it is allowed.
		thinking =
			storage?.getItem(thinkingStorageKey) === 'true' &&
			modelFor(selectedModelId).thinking === 'optional';
	}

	if (storage === undefined) {
		onMount(() => {
			storage = localStorage;
			restore();
		});
	} else {
		restore();
	}

	function setThinking(next: boolean): void {
		thinking = next;
		storage?.setItem(thinkingStorageKey, String(next));
	}

	return {
		get selectedModelId() {
			return selectedModelId;
		},
		get selectedModel() {
			return modelFor(selectedModelId);
		},
		get thinking() {
			// An always-on model thinks whether or not anyone asked, so reporting
			// anything else would put a false statement in front of the reader.
			return modelFor(selectedModelId).thinking === 'always' || thinking;
		},
		get canChooseThinking() {
			return modelFor(selectedModelId).thinking === 'optional';
		},
		select(modelId: string) {
			selectedModelId = modelId;
			storage?.setItem(modelStorageKey, modelId);
			if (modelFor(modelId).thinking !== 'optional') setThinking(false);
		},
		setThinking
	};
}
