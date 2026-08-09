import type { ModelCatalog, SelectableModel } from '@house-elf/shared';
import { useEffect, useMemo, useRef, useState } from 'react';

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
 * `supportedParameters` rather than the presence of a `reasoning` object: the
 * two disagree on the live catalog, and the parameter list is the one that
 * says what the model accepts being asked. The object says how it reasons.
 */
function thinkingIsOptional(model: SelectableModel): boolean {
	return model.supportedParameters.includes('reasoning') && model.reasoning?.mandatory !== true;
}

interface RestoredSelection {
	selectedModelId: string;
	thinking: boolean;
}

/** Reads a stored model id and thinking flag, dropping anything the catalog cannot act on. */
function restore(
	catalog: ModelCatalog,
	modelsById: ReadonlyMap<string, SelectableModel>,
	initialModel: SelectableModel,
	storage: ModelSelectionStorage
): RestoredSelection {
	const storedModelId = storage.getItem(modelStorageKey);
	const selectedModelId =
		storedModelId !== null && modelsById.has(storedModelId)
			? storedModelId
			: catalog.initialModelId;
	// Read after the model, because the model decides whether it is allowed.
	const model = modelsById.get(selectedModelId) ?? initialModel;
	const thinking = storage.getItem(thinkingStorageKey) === 'true' && thinkingIsOptional(model);
	return { selectedModelId, thinking };
}

/** The catalog schema requires `initialModelId` to name one of its own models. */
function failMissingInitialModel(catalog: ModelCatalog): never {
	throw new Error(`Model catalog is missing its own initial model: ${catalog.initialModelId}`);
}

/**
 * Owns the reader's model choice and whether the next message asks for
 * thinking, restored from storage after hydration.
 *
 * The two live together because choosing a model is the moment a stale
 * thinking flag is forced off, and switching away and back does not bring it
 * back — an unasked-for expensive request is worse than an extra click.
 *
 * Storage is read in an effect so the server render and first client render
 * agree (TanStack Start SSRs, and `localStorage` does not exist on the
 * server). Tests pass `initialStorage` to read restored state synchronously,
 * no `act` required.
 */
export function useModelSelection(
	catalog: ModelCatalog,
	initialStorage?: ModelSelectionStorage
): ModelSelection {
	const modelsById = useMemo(
		() => new Map(catalog.models.map((model) => [model.id, model])),
		[catalog]
	);
	const initialModel = modelsById.get(catalog.initialModelId) ?? failMissingInitialModel(catalog);
	const storageRef = useRef<ModelSelectionStorage | undefined>(initialStorage);

	// One state object, not two, so a storage-provided restore runs once per
	// render rather than once per field.
	const [{ selectedModelId, thinking }, setState] = useState<RestoredSelection>(() =>
		initialStorage
			? restore(catalog, modelsById, initialModel, initialStorage)
			: { selectedModelId: catalog.initialModelId, thinking: false }
	);

	useEffect(() => {
		// Real deps, not a suppression: `storageRef.current` already guards this
		// to fire once, so listing them is free. React Compiler refuses to
		// compile a hook that disables the exhaustive-deps rule.
		if (storageRef.current) return;
		const storage = localStorage;
		storageRef.current = storage;
		setState(restore(catalog, modelsById, initialModel, storage));
	}, [catalog, modelsById, initialModel]);

	function modelFor(modelId: string): SelectableModel {
		// An id the catalog does not carry falls back to the model the picker
		// opens on, not to whichever model the catalog happens to list first.
		return modelsById.get(modelId) ?? initialModel;
	}

	function setThinking(next: boolean): void {
		setState((state) => ({ ...state, thinking: next }));
		storageRef.current?.setItem(thinkingStorageKey, String(next));
	}

	const selectedModel = modelFor(selectedModelId);

	return {
		selectedModelId,
		selectedModel,
		// A mandatory-reasoning model thinks whether or not anyone asked, so
		// reporting anything else would put a false statement in front of the reader.
		thinking: selectedModel.reasoning?.mandatory === true || thinking,
		canChooseThinking: thinkingIsOptional(selectedModel),
		select(modelId: string) {
			setState((state) => ({ ...state, selectedModelId: modelId }));
			storageRef.current?.setItem(modelStorageKey, modelId);
			if (!thinkingIsOptional(modelFor(modelId))) setThinking(false);
		},
		setThinking
	};
}
