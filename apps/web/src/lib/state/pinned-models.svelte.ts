import type { SelectableModel } from '@house-elf/shared';
import { onMount } from 'svelte';

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
 * Owns the reader's pinned models, and restores them after hydration.
 *
 * A pinned id that has left the catalog is dropped on load rather than shown as
 * a broken entry — the catalog is the source of what exists, and a pin that
 * points at nothing is not the reader's problem to clear.
 *
 * Production storage is attached in `onMount` so the server and first browser
 * render agree. Tests may supply the real jsdom storage directly and exercise
 * the state without a component harness.
 */
export function createPinnedModels(
	catalog: readonly SelectableModel[],
	initialStorage?: PinnedStorage
): PinnedModels {
	let storage = initialStorage;
	// Built once from a catalog that does not change for the lifetime of this
	// state and never written to, so nothing can depend on it reactively.
	// eslint-disable-next-line svelte/prefer-svelte-reactivity
	const knownIds = new Set(catalog.map((model) => model.id));
	let pinnedIds = $state<string[]>([]);
	let collapsed = $state(false);

	function restore(): void {
		const stored = storage?.getItem(pinnedStorageKey);
		if (stored !== null && stored !== undefined) {
			// A stale id — one the catalog no longer carries — is dropped silently,
			// because the catalog is the source of what exists. The stored list is
			// rewritten so a later save does not resurrect it.
			const parsed = readStored(stored);
			const kept = parsed.filter((id) => knownIds.has(id));
			pinnedIds = sortPins(kept);
			if (kept.length !== parsed.length) {
				storage?.setItem(pinnedStorageKey, JSON.stringify(kept));
			}
		}

		collapsed = storage?.getItem(collapsedStorageKey) === 'true';
	}

	if (storage === undefined) {
		onMount(() => {
			storage = localStorage;
			restore();
		});
	} else {
		restore();
	}

	function persist(): void {
		storage?.setItem(pinnedStorageKey, JSON.stringify(pinnedIds));
	}

	return {
		get pinnedIds() {
			return pinnedIds;
		},
		get collapsed() {
			return collapsed;
		},
		isPinned(modelId: string) {
			return pinnedIds.includes(modelId);
		},
		toggle(modelId: string) {
			if (pinnedIds.includes(modelId)) {
				pinnedIds = pinnedIds.filter((id) => id !== modelId);
			} else {
				pinnedIds = sortPins([...pinnedIds, modelId]);
			}
			persist();
		},
		toggleCollapsed() {
			collapsed = !collapsed;
			storage?.setItem(collapsedStorageKey, String(collapsed));
		}
	};
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
