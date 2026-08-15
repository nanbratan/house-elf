import { readCookie, writeCookie } from '../utils/cookies.ts';

// Cookie names are RFC 6265 tokens, so they cannot carry the colon the old
// `house-elf:*` localStorage keys used.
const modelCookieName = 'selected_model';
const thinkingCookieName = 'thinking';

export interface ModelSelectionSeed {
	selectedModelId: string | null;
	thinking: string | null;
}

/**
 * Reads the persisted model choice. **Call this from a route loader, not from a
 * component.**
 *
 * A cookie read during render only works outside a Suspense boundary: the request
 * context lives in AsyncLocalStorage, and the continuation that renders a suspended
 * subtree has lost it, so `getCookie` comes back empty. `ChatView` renders inside
 * one. Loaders run with the context intact, and their result is serialised into the
 * HTML — so the client's first render sees the same value and there is nothing to
 * correct after hydration.
 */
export function readModelSelectionSeed(): ModelSelectionSeed {
	return {
		selectedModelId: readCookie(modelCookieName) ?? null,
		thinking: readCookie(thinkingCookieName) ?? null
	};
}

/** Thrown when the seed is asked for a key it does not carry. */
export class UnknownSeedKeyError extends Error {
	constructor(readonly key: string) {
		super(`Model selection seed has no value for '${key}'`);
		this.name = 'UnknownSeedKeyError';
	}
}

/**
 * A `Storage`-shaped view over a seed: reads answer from the value the loader
 * already resolved, writes go to the cookie the next request will carry.
 *
 * `Storage.getItem` takes any string, but this seed carries exactly two settings.
 * An unrecognised key is a caller bug — a renamed constant, a typo — so it throws
 * rather than handing back whichever value happened to be on the other side of a
 * ternary.
 */
export function seedStorage(seed: ModelSelectionSeed): Pick<Storage, 'getItem' | 'setItem'> {
	return {
		getItem: (key: string) => {
			switch (key) {
				case modelCookieName:
					return seed.selectedModelId;
				case thinkingCookieName:
					return seed.thinking;
				default:
					throw new UnknownSeedKeyError(key);
			}
		},
		setItem: writeCookie
	};
}

export { modelCookieName, thinkingCookieName };
