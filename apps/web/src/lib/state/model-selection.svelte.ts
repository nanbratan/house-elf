import type { ModelCatalog } from '@house-elf/shared';
import { onMount } from 'svelte';

const storageKey = 'house-elf:selected-model';

type ModelSelectionStorage = Pick<Storage, 'getItem' | 'setItem'>;

export interface ModelSelection {
	readonly selectedModelId: string;
	select(modelId: string): void;
}

/**
 * Owns the reader's model choice and restores it after hydration.
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

	function restore(): void {
		const storedModelId = storage?.getItem(storageKey);
		if (
			storedModelId !== null &&
			storedModelId !== undefined &&
			catalog.models.some((model) => model.id === storedModelId)
		) {
			selectedModelId = storedModelId;
		}
	}

	if (storage === undefined) {
		onMount(() => {
			storage = localStorage;
			restore();
		});
	} else {
		restore();
	}

	return {
		get selectedModelId() {
			return selectedModelId;
		},
		select(modelId: string) {
			selectedModelId = modelId;
			storage?.setItem(storageKey, modelId);
		}
	};
}
