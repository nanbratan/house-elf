import type { ModelCatalog, SelectableModel } from '@house-elf/shared';
import { useMemo, useState } from 'react';

import { modelCookieName } from '../chat/model-selection-seed.ts';

// One definition of the key, shared with the loader that reads it.
const modelStorageKey = modelCookieName;

type ModelSelectionStorage = Pick<Storage, 'getItem' | 'setItem'>;

export interface ModelSelection {
	readonly selectedModelId: string;
	readonly selectedModel: SelectableModel;
	select(modelId: string): void;
}

/** Reads a stored model id, falling back when the catalog no longer carries it. */
function restore(
	catalog: ModelCatalog,
	knownIds: ReadonlySet<string>,
	storage: ModelSelectionStorage
): string {
	const storedModelId = storage.getItem(modelStorageKey);
	return storedModelId !== null && knownIds.has(storedModelId)
		? storedModelId
		: catalog.initialModelId;
}

/** The catalog schema requires `initialModelId` to name one of its own models. */
function failMissingInitialModel(catalog: ModelCatalog): never {
	throw new Error(`Model catalog is missing its own initial model: ${catalog.initialModelId}`);
}

/**
 * Owns the reader's model choice, restored from storage as the first render
 * happens.
 *
 * How a model answers is no longer here: thinking, effort, temperature and cost
 * tier are per model and belong to `useModelSettings`, which keys them by model
 * id. That is what removed the rule this hook used to carry — that choosing a
 * model forces a stale thinking flag off — because a setting made about one
 * model is now never read for another.
 *
 * Storage is read during render rather than in an effect, and the caller supplies
 * it. In the app it is backed by a route loader's cookie read, so the server render
 * and the first client render see the same value and agree — `localStorage` could
 * only be read after hydration, which the reader saw as the model name flicking
 * from the default to their choice.
 */
export function useModelSelection(
	catalog: ModelCatalog,
	storage: ModelSelectionStorage
): ModelSelection {
	const modelsById = useMemo(
		() => new Map(catalog.models.map((model) => [model.id, model])),
		[catalog]
	);
	const initialModel = modelsById.get(catalog.initialModelId) ?? failMissingInitialModel(catalog);

	const [selectedModelId, setSelectedModelId] = useState<string>(() =>
		restore(catalog, new Set(modelsById.keys()), storage)
	);

	return {
		selectedModelId,
		// An id the catalog does not carry falls back to the model the picker
		// opens on, not to whichever model the catalog happens to list first.
		selectedModel: modelsById.get(selectedModelId) ?? initialModel,
		select(modelId: string) {
			setSelectedModelId(modelId);
			storage.setItem(modelStorageKey, modelId);
		}
	};
}
