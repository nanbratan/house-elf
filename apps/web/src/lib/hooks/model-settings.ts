import type { SelectableModel } from '@house-elf/shared';
import { useEffect, useRef, useState } from 'react';

import {
	isEmptyEntry,
	modelSettingsStorageKey,
	noStoredSettings,
	parseStoredSettings,
	pruneSettings,
	type StoredModelSettings
} from '../utils/stored-model-settings.ts';

type SettingsStorage = Pick<Storage, 'getItem' | 'setItem'>;

export interface ModelSettings {
	/** False until storage has been read; the trigger draws a skeleton until it is. */
	readonly restored: boolean;
	/** What is stored for the model the composer is currently on. */
	readonly stored: StoredModelSettings;
	/** Sets one field for the current model; `undefined` returns it to unset. */
	set<Field extends keyof StoredModelSettings>(
		field: Field,
		value: StoredModelSettings[Field]
	): void;
}

interface SettingsState {
	settings: Record<string, StoredModelSettings>;
	restored: boolean;
}

/**
 * Reads the stored map and drops anything the catalog can no longer act on.
 *
 * Deliberately does not write — the effect below is the only writer.
 */
function restore(models: readonly SelectableModel[], storage: SettingsStorage): SettingsState {
	const stored = parseStoredSettings(storage.getItem(modelSettingsStorageKey));

	return { settings: pruneSettings(stored, models), restored: true };
}

/**
 * Owns the reader's per-model settings, restored from storage after hydration.
 *
 * `localStorage` cannot be read during SSR, hence the effect. Tests pass
 * `initialStorage` to get restored state synchronously.
 */
export function useModelSettings(
	models: readonly SelectableModel[],
	modelId: string,
	initialStorage?: SettingsStorage
): ModelSettings {
	const storageRef = useRef<SettingsStorage | undefined>(initialStorage);

	// One object, so `restored` and the map it describes can never disagree.
	const [{ settings, restored }, setState] = useState<SettingsState>(() =>
		initialStorage ? restore(models, initialStorage) : { settings: {}, restored: false }
	);

	useEffect(() => {
		// Real deps, not a suppression — `storageRef.current` guards this to fire
		// once. See model-selection.ts for why the deps are listed.
		if (storageRef.current) return;
		const storage = localStorage;
		storageRef.current = storage;
		setState(restore(models, storage));
	}, [models]);

	useEffect(() => {
		// Persist whenever the map changes, which also rewrites it after a restore
		// prunes something. `set` cannot write instead: it builds the next map
		// inside the state updater, which React runs after `set` has returned.
		if (!restored) return;
		storageRef.current?.setItem(modelSettingsStorageKey, JSON.stringify(settings));
	}, [settings, restored]);

	return {
		restored,
		stored: settings[modelId] ?? noStoredSettings,
		set(field, value) {
			// Built from `state`, not from this render's `settings`, so a second
			// call in the same handler builds on the first instead of replacing it.
			setState((state) => {
				const entry: StoredModelSettings = {
					...(state.settings[modelId] ?? noStoredSettings),
					[field]: value
				};
				// Drop a model with nothing left, so storage lists only what changed.
				const settings = Object.fromEntries(
					Object.entries({ ...state.settings, [modelId]: entry }).filter(
						([, modelEntry]) => !isEmptyEntry(modelEntry)
					)
				);

				return { ...state, settings };
			});
		}
	};
}
