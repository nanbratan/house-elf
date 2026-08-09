import { cjk } from '@streamdown/cjk';
import { code } from '@streamdown/code';
import { math } from '@streamdown/math';
import type { ComponentProps } from 'react';
import { memo } from 'react';
import { Streamdown } from 'streamdown';
import type { PluginConfig } from 'streamdown';

import { cn } from '../../utils/cn.ts';

export type MessageResponseProps = ComponentProps<typeof Streamdown>;

// The plugin packages are published from the same Streamdown monorepo and are designed to
// be passed through unchanged. Their highlighted-code callback types disagree only because
// they each re-export Shiki types from their own package graph. Mermaid is deliberately
// absent: an enormous dependency for a chat whose bundle is already highlighter-dominated.
const streamdownPlugins = { cjk, code, math } as PluginConfig;

export const MessageResponse = memo(
	({ className, ...props }: MessageResponseProps) => (
		<Streamdown
			className={cn('size-full [&>*:first-child]:mt-0 [&>*:last-child]:mb-0', className)}
			plugins={streamdownPlugins}
			{...props}
		/>
	),
	// Hand memoisation, justified per react.instructions.md: markdown parsing is an
	// expensive non-React computation, and during streaming every settled part would
	// otherwise re-parse on every token. children is the markdown source string and
	// isAnimating the only other visual driver, so a two-field compare is sufficient.
	(prevProps, nextProps) =>
		prevProps.children === nextProps.children && nextProps.isAnimating === prevProps.isAnimating
);

MessageResponse.displayName = 'MessageResponse';
