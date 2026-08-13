/**
 * Shared surface recipes from the assistant-ui elements registry.
 *
 * Only the recipes the components in this directory actually use are kept; the
 * registry is the backup for the rest. `paper` and `inkButton` are kept against
 * the open question of which composer styling stays — see `composer.tsx`.
 */

export const paper =
	'bg-background shadow-[0_1px_2px_rgba(0,0,0,0.04),0_12px_32px_-16px_rgba(0,0,0,0.12)] dark:bg-popover dark:shadow-none';

export const inkButton =
	'bg-foreground text-background transition-[opacity,scale] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] hover:opacity-90 active:scale-[0.96] motion-reduce:transition-none';

export const iconSwap =
	'[grid-area:1/1] transition-[opacity,scale,filter] duration-200 ease-[cubic-bezier(0.2,0,0,1)] motion-reduce:transition-none';

export const iconSwapIn = 'scale-100 opacity-100 blur-none';

export const iconSwapOut = 'scale-[0.25] opacity-0 blur-[4px]';
