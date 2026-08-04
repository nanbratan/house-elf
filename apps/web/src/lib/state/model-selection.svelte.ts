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
	// Built once from a catalog that never changes for the lifetime of this
	// selection and never written to, so nothing can depend on it reactively.
	// eslint-disable-next-line svelte/prefer-svelte-reactivity
	const modelsById = new Map(catalog.models.map((model) => [model.id, model]));
	// The schema guarantees the catalog carries its own initial model, so the
	// last resort here is unreachable.
	const initialModel = modelsById.get(catalog.initialModelId) ?? catalog.models[0];

	function modelFor(modelId: string): SelectableModel {
		// An id the catalog does not carry falls back to the model the picker opens
		// on, not to whichever model the catalog happens to list first.
		return modelsById.get(modelId) ?? initialModel;
	}

	/**
	 * `supportedParameters` rather than the presence of a `reasoning` object: the
	 * two disagree on the live catalog, and the parameter list is the one that
	 * says what the model accepts being asked. The object says how it reasons.
	 */
	function thinkingIsOptional(modelId: string): boolean {
		const model = modelFor(modelId);
		return model.supportedParameters.includes('reasoning') && model.reasoning?.mandatory !== true;
	}

	function restore(): void {
		const storedModelId = storage?.getItem(modelStorageKey);
		if (storedModelId !== null && storedModelId !== undefined && modelsById.has(storedModelId)) {
			selectedModelId = storedModelId;
		}

		// Read after the model, because the model decides whether it is allowed.
		thinking =
			storage?.getItem(thinkingStorageKey) === 'true' && thinkingIsOptional(selectedModelId);
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
			// A mandatory-reasoning model thinks whether or not anyone asked, so
			// reporting anything else would put a false statement in front of the reader.
			return modelFor(selectedModelId).reasoning?.mandatory === true || thinking;
		},
		get canChooseThinking() {
			return thinkingIsOptional(selectedModelId);
		},
		select(modelId: string) {
			selectedModelId = modelId;
			storage?.setItem(modelStorageKey, modelId);
			if (!thinkingIsOptional(modelId)) setThinking(false);
		},
		setThinking
	};
}
