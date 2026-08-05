/**
 * A stub's identity. Symbols rather than strings, so two stubs cannot collide and
 * a typo is a compile error rather than a report that nothing rendered.
 *
 * They live here, not in each stub's `<script module>`, because TypeScript cannot
 * resolve named exports from a `.svelte` file imported by a `.ts` one — only
 * `svelte-check` can — which leaves the type-aware lint rules with `any`.
 *
 * The description doubles as the marker's `data-testid`.
 */
export const composerStub = Symbol('composer');
export const errorNoticeStub = Symbol('error-notice');
export const filterSelectStub = Symbol('filter-select');
export const markdownStub = Symbol('markdown');
export const messagePartStub = Symbol('part');
export const modelFiltersStub = Symbol('model-filters');
export const modelPickerStub = Symbol('model-picker');
export const reasoningStub = Symbol('reasoning');
export const stickToBottomStub = Symbol('stick-to-bottom');
export const toolCardStub = Symbol('tool-card');
