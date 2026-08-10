import 'react';

/**
 * CSS custom properties are valid in `style`; @types/react's CSSProperties does not say
 * so, which is why upstream components reach for `as CSSProperties`. Declaring it keeps
 * the assertion out of our own code. The key is a template literal, so only `--`-prefixed
 * properties are admitted and ordinary typos still fail.
 */
type CustomProperties = Record<`--${string}`, string | number | undefined>;

declare module 'react' {
	// Declaration merging requires an interface, and this one is memberless by nature: its
	// only job is to merge CustomProperties into the existing CSSProperties.
	// eslint-disable-next-line @typescript-eslint/no-empty-object-type
	interface CSSProperties extends CustomProperties {}
}
