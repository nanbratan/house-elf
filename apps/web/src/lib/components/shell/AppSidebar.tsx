import { Link, useMatchRoute } from '@tanstack/react-router';
import { PlusIcon } from 'lucide-react';
import { useId } from 'react';

import { cn } from '../../utils/cn.ts';
import { buttonVariants } from '../ui/button.tsx';
import {
	Sidebar,
	SidebarContent,
	SidebarGroup,
	SidebarGroupLabel,
	SidebarHeader,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	useSidebar
} from '../ui/sidebar.tsx';

// Placeholder rows until threads are persisted.
const conversations = [
	{ id: '1', title: 'Placeholder conversation' },
	{ id: '2', title: 'Another placeholder' }
];

/** Navigation rail: the brand, the new-chat action and the conversation list. */
export function AppSidebar() {
	const matchRoute = useMatchRoute();
	const { setOpenMobile } = useSidebar();
	const conversationsLabelId = useId();

	// Called unconditionally rather than behind an `isMobile` check: on desktop the
	// mobile drawer is already closed, so this is a no-op, and the guard would be one
	// more thing to keep in step with the breakpoint.
	function closeDrawer() {
		setOpenMobile(false);
	}

	return (
		<Sidebar variant="inset" collapsible="offcanvas">
			{/*
			 * Deliberately unbordered, for the same reason the page header in `AppShell` is:
			 * the separation is space and the group label below, not a rule. A border here
			 * would be a second separator doing the job the label already does.
			 */}
			<SidebarHeader className="gap-5 px-3 pt-5 pb-2">
				{/* Set in the heading face, a step larger than the button beneath it and two
				    steps larger than a menu row: size and the gap below are what mark it as
				    the wordmark rather than the first control. */}
				<span className="cn-font-heading px-1 text-lg leading-none font-semibold tracking-tight">
					Mr. Meeseeks
				</span>

				{/*
				 * Styled with `buttonVariants` rather than rendered through `Button`. This is
				 * navigation, so it has to stay a link: Base UI's Button assumes a native
				 * `<button>` and warns when handed an anchor, and telling it otherwise with
				 * `nativeButton={false}` makes it stamp `role="button"` on the anchor, which
				 * takes the link semantics away for exactly the users who need them.
				 */}
				<Link
					to="/c/new"
					onClick={closeDrawer}
					className={cn(buttonVariants({ variant: 'outline' }), 'w-full justify-start gap-2')}
				>
					<PlusIcon />
					New chat
				</Link>
			</SidebarHeader>

			<SidebarContent>
				<SidebarGroup>
					{/*
					 * The label stays a div rather than a heading: `routes/index.tsx` already
					 * renders an h1 named "Conversations", and a second heading with that name
					 * would make every `getByRole('heading')` query ambiguous. Naming the nav
					 * landmark from it gets the same accessible outcome without the clash.
					 */}
					<SidebarGroupLabel id={conversationsLabelId}>Conversations</SidebarGroupLabel>

					<nav aria-labelledby={conversationsLabelId}>
						{/* The registry menu is `gap-0`, which suits a dense nav tree; a list of
						    titles reads better with the rows separated. */}
						<SidebarMenu className="gap-1">
							{conversations.map((conversation) => (
								<SidebarMenuItem key={conversation.id}>
									{/*
									 * Both halves are needed: `Link` sets `aria-current="page"` itself,
									 * which is the accessible outcome, while `isActive` is what drives
									 * the cva `data-active:` styling.
									 */}
									<SidebarMenuButton
										render={
											<Link to="/c/$id" params={{ id: conversation.id }} onClick={closeDrawer} />
										}
										isActive={Boolean(
											matchRoute({ to: '/c/$id', params: { id: conversation.id } })
										)}
									>
										<span>{conversation.title}</span>
									</SidebarMenuButton>
								</SidebarMenuItem>
							))}
						</SidebarMenu>
					</nav>
				</SidebarGroup>
			</SidebarContent>
		</Sidebar>
	);
}
