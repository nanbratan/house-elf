import type { SelectableModel } from '@house-elf/shared';
import { useEffect, useMemo, useRef, useState } from 'react';

const pinnedStorageKey = 'house-elf:pinned-models';
const collapsedStorageKey = 'house-elf:pinned-collapsed';

type PinnedStorage = Pick<Storage, 'getItem' | 'setItem'>;

export interface PinnedModels {
	readonly pinnedIds: readonly string[];
	/** Whether a model is in the pinned section. */
	isPinned(modelId: string): boolean;
	/** Adds a model to the pinned section, or removes it if it is already there. */
	toggle(modelId: string): void;
	/** Whether the pinned section is folded away. Persists with the pins. */
	readonly collapsed: boolean;
	/** Folds or unfolds the pinned section. */
	toggleCollapsed(): void;
}

/**
 * Pins sort alphabetically, not by pin time — stable position beats recency for
 * something the reader is trying to hit without reading.
 */
function sortPins(ids: readonly string[]): string[] {
	return [...ids].sort((id, other) => id.localeCompare(other));
}

/** Parses the stored list defensively; a value that is not a list is treated as empty. */
function readStored(stored: string): string[] {
	try {
		const parsed: unknown = JSON.parse(stored);
		return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === 'string') : [];
	} catch {
		return [];
	}
}

interface RestoredPins {
	pinnedIds: string[];
	collapsed: boolean;
}

/**
 * Reads the stored pins and collapse flag, dropping any id the catalog no
 * longer carries and rewriting the stored list so a later save does not
 * resurrect it.
 */
function restore(knownIds: ReadonlySet<string>, storage: PinnedStorage): RestoredPins {
	const stored = storage.getItem(pinnedStorageKey);
	let pinnedIds: string[] = [];

	if (stored !== null) {
		const parsed = readStored(stored);
		const kept = parsed.filter((id) => knownIds.has(id));
		pinnedIds = sortPins(kept);
		if (kept.length !== parsed.length) {
			storage.setItem(pinnedStorageKey, JSON.stringify(kept));
		}
	}

	return { pinnedIds, collapsed: storage.getItem(collapsedStorageKey) === 'true' };
}

/**
 * Owns the reader's pinned models, restored from storage after hydration.
 *
 * A pinned id that has left the catalog is dropped on load rather than shown
 * as a broken entry.
 *
 * Storage is read in an effect for the same SSR reason as model-selection.
 * Tests pass `initialStorage` to read restored state synchronously.
 */
export function usePinnedModels(
	catalog: readonly SelectableModel[],
	initialStorage?: PinnedStorage
): PinnedModels {
	// Built once from a catalog that does not change for the lifetime of this
	// state and never written to, so nothing can depend on it reactively.
	const knownIds = useMemo(() => new Set(catalog.map((model) => model.id)), [catalog]);
	const storageRef = useRef<PinnedStorage | undefined>(initialStorage);

	// One state object, not two, so a storage-provided restore — which can
	// rewrite storage as a side effect — runs once per render rather than
	// once per field.
	const [{ pinnedIds, collapsed }, setState] = useState<RestoredPins>(() =>
		initialStorage ? restore(knownIds, initialStorage) : { pinnedIds: [], collapsed: false }
	);

	useEffect(() => {
		// Real deps, not a suppression — `storageRef.current` guards this to
		// fire once. See model-selection.ts for why the deps are listed.
		if (storageRef.current) return;
		const storage = localStorage;
		storageRef.current = storage;
		setState(restore(knownIds, storage));
	}, [knownIds]);

	return {
		pinnedIds,
		collapsed,
		isPinned(modelId: string) {
			return pinnedIds.includes(modelId);
		},
		toggle(modelId: string) {
			const next = pinnedIds.includes(modelId)
				? pinnedIds.filter((id) => id !== modelId)
				: sortPins([...pinnedIds, modelId]);
			setState((state) => ({ ...state, pinnedIds: next }));
			storageRef.current?.setItem(pinnedStorageKey, JSON.stringify(next));
		},
		toggleCollapsed() {
			const next = !collapsed;
			setState((state) => ({ ...state, collapsed: next }));
			storageRef.current?.setItem(collapsedStorageKey, String(next));
		}
	};
}
