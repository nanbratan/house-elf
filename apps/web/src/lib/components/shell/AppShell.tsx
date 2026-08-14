import { useState, type ReactNode } from 'react';

import { AppSidebar } from './AppSidebar.tsx';

export interface AppShellProps {
	children: ReactNode;
}

/** The frame every route renders into: the sidebar, its toggle, and the main region. */
export function AppShell({ children }: AppShellProps) {
	const [sidebarOpen, setSidebarOpen] = useState(true);

	function toggleSidebar() {
		setSidebarOpen((open) => !open);
	}

	return (
		<div className="flex h-screen overflow-hidden">
			<AppSidebar open={sidebarOpen} />

			<div className="flex min-w-0 flex-1 flex-col">
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
					<button
						type="button"
						onClick={toggleSidebar}
						aria-label={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
						aria-expanded={sidebarOpen}
						className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
					>
						<svg
							className="size-4"
							viewBox="0 0 16 16"
							fill="none"
							stroke="currentColor"
							strokeWidth={1.5}
							aria-hidden="true"
						>
							<rect x="1.5" y="2.5" width="13" height="11" rx="2" />
							<line x1="6" y1="2.5" x2="6" y2="13.5" />
						</svg>
					</button>
				</header>

				<main className="min-h-0 flex-1 overflow-y-auto">{children}</main>
			</div>
		</div>
	);
}
