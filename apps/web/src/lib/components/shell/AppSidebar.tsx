import { Link } from '@tanstack/react-router';

// Placeholder rows until threads are persisted.
const conversations = [
	{ id: '1', title: 'Placeholder conversation' },
	{ id: '2', title: 'Another placeholder' }
];

export interface AppSidebarProps {
	open: boolean;
}

/** Navigation rail: the brand, the new-chat action and the conversation list. */
export function AppSidebar({ open }: AppSidebarProps) {
	return (
		<aside
			className={`flex shrink-0 flex-col overflow-hidden border-sidebar-border bg-sidebar text-sidebar-foreground transition-[width] duration-200 ${
				open ? 'w-64 border-r' : 'w-0'
			}`}
			// Zero width still leaves the links focusable and visible to a screen
			// reader. `inert` is what takes them out of the tab order and the
			// accessibility tree.
			inert={!open}
		>
			<div className="flex h-12 shrink-0 items-center px-4">
				<span className="text-sm font-semibold whitespace-nowrap">house-elf</span>
			</div>

			<div className="px-2 pb-2">
				<Link
					to="/c/new"
					className="block rounded-md border border-sidebar-border px-3 py-2 text-sm whitespace-nowrap transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
				>
					New chat
				</Link>
			</div>

			<nav className="flex-1 overflow-y-auto px-2 py-2">
				{/*
				  activeProps/inactiveProps append to className rather than replacing it.
				  Link matches against the router's own location and sets
				  aria-current="page" on the active one unasked, so the highlight needs no
				  pathname comparison here.
				*/}
				<ul className="space-y-1">
					{conversations.map((conversation) => (
						<li key={conversation.id}>
							<Link
								to="/c/$id"
								params={{ id: conversation.id }}
								className="block truncate rounded-md px-3 py-2 text-sm whitespace-nowrap transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
								activeProps={{
									className: 'bg-sidebar-accent text-sidebar-accent-foreground'
								}}
								inactiveProps={{ className: 'text-muted-foreground' }}
							>
								{conversation.title}
							</Link>
						</li>
					))}
				</ul>
			</nav>
		</aside>
	);
}
