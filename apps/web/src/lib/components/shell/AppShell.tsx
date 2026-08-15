import { type ReactNode } from 'react';

import { SidebarInset, SidebarProvider, SidebarTrigger, useSidebar } from '../ui/sidebar.tsx';
import { AppSidebar } from './AppSidebar.tsx';

export interface AppShellProps {
	children: ReactNode;
	defaultSidebarOpen: boolean;
}

/** The frame every route renders into: the sidebar, its toggle, and the main region. */
export function AppShell({ children, defaultSidebarOpen }: AppShellProps) {
	return (
		<SidebarProvider
			defaultOpen={defaultSidebarOpen}
			// The provider ships `min-h-svh`, which would let the frame grow past the
			// viewport; `app.css` sets `overscroll-behavior: none` precisely because the
			// transcript owns scrolling. `min-h-0` is not redundant — it and `min-h-svh`
			// are different tailwind-merge groups, so without it the registry class
			// survives. `dvh` rather than `screen`: `100vh` on mobile browsers ignores the
			// URL bar and pushes the composer off-screen.
			className="h-dvh min-h-0 overflow-hidden"
		>
			<AppSidebar />

			{/*
			 * `SidebarInset` is the `<main>`. It has no `min-h-0` of its own, and without
			 * one the scroller below cannot shrink and the page scrolls instead of the
			 * transcript.
			 *
			 * `overflow-hidden` is what makes the inset's rounded corners visible at the
			 * top: the header below is opaque and square, and as the first child it paints
			 * straight over them. Clipping to the radius squares nothing and costs nothing
			 * — the scroller inside keeps its own overflow.
			 */}
			<SidebarInset className="min-h-0 overflow-hidden">
				{/*
				 * In the flow, above the scrolling region rather than over it, so the
				 * transcript's scrollbar starts below the header instead of running behind
				 * it. `h-header` is the token the thread subtracts when centring its
				 * composer — see `--spacing-header`.
				 *
				 * Deliberately unbordered: the separation is the opaque background plus the
				 * transcript's own top padding, not a rule. The background is not optional
				 * for that — without it the transcript shows through as it scrolls past.
				 */}
				<header className="flex h-header shrink-0 items-center gap-3 bg-background px-3">
					<AppSidebarTrigger />
				</header>

				<div className="min-h-0 flex-1 overflow-y-auto overscroll-none">{children}</div>
			</SidebarInset>
		</SidebarProvider>
	);
}

/**
 * The registry trigger is a static "Toggle Sidebar" with no `aria-expanded`. This
 * keeps the name we already had, which says what the click will do.
 */
function AppSidebarTrigger() {
	const { open, isMobile, openMobile } = useSidebar();
	const expanded = isMobile ? openMobile : open;

	return (
		<SidebarTrigger
			aria-label={expanded ? 'Collapse sidebar' : 'Expand sidebar'}
			aria-expanded={expanded}
			className="text-muted-foreground hover:text-foreground"
		/>
	);
}
