import { mergeProps } from '@base-ui/react/merge-props';
import { useRender } from '@base-ui/react/use-render';
import { cva, type VariantProps } from 'class-variance-authority';
import { PanelLeftIcon } from 'lucide-react';
import { createContext, useContext, useState, type ComponentProps } from 'react';

import { useIsMobile } from '../../hooks/use-mobile.ts';
import { cn } from '../../utils/cn.ts';
import { Button } from './button.tsx';
import { Sheet, SheetContent, SheetTitle } from './sheet.tsx';

/** Exported so the SSR seed reads the same key this component writes. */
export const SIDEBAR_COOKIE_NAME = 'sidebar_state';

const SIDEBAR_COOKIE_MAX_AGE = 60 * 60 * 24 * 7;
const SIDEBAR_WIDTH = '16rem';
const SIDEBAR_WIDTH_MOBILE = '18rem';
const SIDEBAR_WIDTH_ICON = '3rem';

interface SidebarContextProps {
	state: 'expanded' | 'collapsed';
	open: boolean;
	setOpen: (open: boolean) => void;
	openMobile: boolean;
	setOpenMobile: (open: boolean) => void;
	isMobile: boolean;
	toggleSidebar: () => void;
}

const SidebarContext = createContext<SidebarContextProps | null>(null);

function useSidebar() {
	const context = useContext(SidebarContext);

	if (context === null) {
		throw new Error('useSidebar must be used within a SidebarProvider.');
	}

	return context;
}

function SidebarProvider({
	defaultOpen,
	open: openProp,
	onOpenChange: setOpenProp,
	className,
	style,
	children,
	...props
}: ComponentProps<'div'> & {
	defaultOpen?: boolean;
	open?: boolean;
	onOpenChange?: (open: boolean) => void;
}) {
	const isMobile = useIsMobile();
	const [openMobile, setOpenMobile] = useState(false);
	const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultOpen ?? true);
	const open = openProp ?? uncontrolledOpen;

	function setOpen(value: boolean | ((value: boolean) => boolean)) {
		const openState = typeof value === 'function' ? value(open) : value;

		if (setOpenProp) {
			setOpenProp(openState);
		} else {
			setUncontrolledOpen(openState);
		}

		document.cookie = `${SIDEBAR_COOKIE_NAME}=${String(openState)}; path=/; max-age=${String(SIDEBAR_COOKIE_MAX_AGE)}`;
	}

	function toggleSidebar() {
		if (isMobile) {
			setOpenMobile(!openMobile);
		} else {
			setOpen(!open);
		}
	}

	const state = open ? 'expanded' : 'collapsed';

	return (
		<SidebarContext.Provider
			value={{ state, open, setOpen, isMobile, openMobile, setOpenMobile, toggleSidebar }}
		>
			<div
				data-slot="sidebar-wrapper"
				style={{
					'--sidebar-width': SIDEBAR_WIDTH,
					'--sidebar-width-icon': SIDEBAR_WIDTH_ICON,
					...style
				}}
				className={cn(
					'group/sidebar-wrapper flex min-h-svh w-full has-data-[variant=inset]:bg-sidebar',
					className
				)}
				{...props}
			>
				{children}
			</div>
		</SidebarContext.Provider>
	);
}

function Sidebar({
	side,
	variant,
	collapsible,
	className,
	children,
	dir,
	...props
}: ComponentProps<'div'> & {
	side?: 'left' | 'right';
	variant?: 'sidebar' | 'floating' | 'inset';
	collapsible?: 'offcanvas' | 'icon';
}) {
	const { isMobile, state, openMobile, setOpenMobile } = useSidebar();
	const edge = side ?? 'left';
	const framing = variant ?? 'sidebar';
	const collapseMode = collapsible ?? 'offcanvas';

	if (isMobile) {
		return (
			<Sheet open={openMobile} onOpenChange={setOpenMobile} {...props}>
				<SheetContent
					dir={dir}
					data-sidebar="sidebar"
					data-slot="sidebar"
					data-mobile="true"
					className="w-(--sidebar-width) bg-sidebar p-0 text-sidebar-foreground"
					style={{ '--sidebar-width': SIDEBAR_WIDTH_MOBILE }}
					side={edge}
					// The registry hides the close button with `[&>button]:hidden`, a
					// direct-child selector that would also swallow any button a caller
					// later renders at the top of the drawer.
					showCloseButton={false}
				>
					{/* A base-ui dialog with no title is an unlabelled dialog. */}
					<SheetTitle className="sr-only">Sidebar</SheetTitle>
					{/*
					 * No `inert` here, unlike the desktop branch: the drawer's visibility is
					 * `openMobile`, and base-ui unmounts the popup when it is closed, so
					 * there is nothing off-screen left to take out of the tab order.
					 */}
					<div className="flex h-full w-full flex-col">{children}</div>
				</SheetContent>
			</Sheet>
		);
	}

	return (
		<div
			className="group peer hidden text-sidebar-foreground md:block"
			data-state={state}
			data-collapsible={state === 'collapsed' ? collapseMode : ''}
			data-variant={framing}
			data-side={edge}
			data-slot="sidebar"
		>
			<div
				data-slot="sidebar-gap"
				className={cn(
					'relative w-(--sidebar-width) bg-transparent transition-[width] duration-200 ease-linear',
					'group-data-[collapsible=offcanvas]:w-0',
					'group-data-[side=right]:rotate-180',
					framing === 'floating' || framing === 'inset'
						? 'group-data-[collapsible=icon]:w-[calc(var(--sidebar-width-icon)+(--spacing(4)))]'
						: 'group-data-[collapsible=icon]:w-(--sidebar-width-icon)'
				)}
			/>
			<div
				data-slot="sidebar-container"
				data-side={edge}
				// The `<aside>` this replaced carried the landmark implicitly; the registry
				// component renders plain divs, so it is restored explicitly here.
				role="complementary"
				aria-label="Sidebar"
				// Translating the container off-screen leaves every link inside it focusable
				// and in the accessibility tree. `inert` is what actually removes them —
				// the registry does not do this, and jsdom cannot prove it either way, so
				// `tests/e2e/shell.spec.ts` is what pins it.
				inert={state === 'collapsed'}
				className={cn(
					'fixed inset-y-0 z-10 hidden h-svh w-(--sidebar-width) transition-[left,right,width] duration-200 ease-linear data-[side=left]:left-0 data-[side=left]:group-data-[collapsible=offcanvas]:left-[calc(var(--sidebar-width)*-1)] data-[side=right]:right-0 data-[side=right]:group-data-[collapsible=offcanvas]:right-[calc(var(--sidebar-width)*-1)] md:flex',
					framing === 'floating' || framing === 'inset'
						? 'p-2 group-data-[collapsible=icon]:w-[calc(var(--sidebar-width-icon)+(--spacing(4))+2px)]'
						: 'group-data-[collapsible=icon]:w-(--sidebar-width-icon) group-data-[side=left]:border-r group-data-[side=right]:border-l',
					className
				)}
				{...props}
			>
				<div
					data-sidebar="sidebar"
					data-slot="sidebar-inner"
					className="flex size-full flex-col bg-sidebar group-data-[variant=floating]:rounded-lg group-data-[variant=floating]:shadow-sm group-data-[variant=floating]:ring-1 group-data-[variant=floating]:ring-sidebar-border"
				>
					{children}
				</div>
			</div>
		</div>
	);
}

type SidebarTriggerProps = ComponentProps<typeof Button>;

function SidebarTrigger({ className, onClick, ...props }: SidebarTriggerProps) {
	const { toggleSidebar } = useSidebar();

	// Base UI decorates the event with `preventBaseUIHandler`, so the handler's
	// parameter has to come from the button's own props rather than React's DOM types.
	function handleClick(event: Parameters<NonNullable<SidebarTriggerProps['onClick']>>[0]) {
		onClick?.(event);
		toggleSidebar();
	}

	return (
		<Button
			data-sidebar="trigger"
			data-slot="sidebar-trigger"
			variant="ghost"
			size="icon-sm"
			className={cn(className)}
			onClick={handleClick}
			{...props}
		>
			<PanelLeftIcon />
			<span className="sr-only">Toggle Sidebar</span>
		</Button>
	);
}

function SidebarInset({ className, ...props }: ComponentProps<'main'>) {
	return (
		<main
			data-slot="sidebar-inset"
			className={cn(
				'relative flex w-full flex-1 flex-col bg-background md:peer-data-[variant=inset]:m-2 md:peer-data-[variant=inset]:ml-0 md:peer-data-[variant=inset]:rounded-xl md:peer-data-[variant=inset]:shadow-sm md:peer-data-[variant=inset]:peer-data-[state=collapsed]:ml-2',
				className
			)}
			{...props}
		/>
	);
}

function SidebarHeader({ className, ...props }: ComponentProps<'div'>) {
	return (
		<div
			data-slot="sidebar-header"
			data-sidebar="header"
			className={cn('flex flex-col gap-2 p-2', className)}
			{...props}
		/>
	);
}

function SidebarContent({ className, ...props }: ComponentProps<'div'>) {
	return (
		<div
			data-slot="sidebar-content"
			data-sidebar="content"
			className={cn(
				'no-scrollbar flex min-h-0 flex-1 flex-col gap-0 overflow-auto group-data-[collapsible=icon]:overflow-hidden',
				className
			)}
			{...props}
		/>
	);
}

function SidebarGroup({ className, ...props }: ComponentProps<'div'>) {
	return (
		<div
			data-slot="sidebar-group"
			data-sidebar="group"
			className={cn('relative flex w-full min-w-0 flex-col p-2', className)}
			{...props}
		/>
	);
}

function SidebarGroupLabel({
	className,
	render,
	...props
}: useRender.ComponentProps<'div'> & ComponentProps<'div'>) {
	return useRender({
		defaultTagName: 'div',
		props: mergeProps<'div'>(
			{
				className: cn(
					'flex h-8 shrink-0 items-center rounded-md px-2 text-xs font-medium text-sidebar-foreground/70 ring-sidebar-ring outline-hidden transition-[margin,opacity] duration-200 ease-linear group-data-[collapsible=icon]:-mt-8 group-data-[collapsible=icon]:opacity-0 focus-visible:ring-2 [&>svg]:size-4 [&>svg]:shrink-0',
					className
				)
			},
			props
		),
		render,
		state: {
			slot: 'sidebar-group-label',
			sidebar: 'group-label'
		}
	});
}

function SidebarMenu({ className, ...props }: ComponentProps<'ul'>) {
	return (
		<ul
			data-slot="sidebar-menu"
			data-sidebar="menu"
			className={cn('flex w-full min-w-0 flex-col gap-0', className)}
			{...props}
		/>
	);
}

function SidebarMenuItem({ className, ...props }: ComponentProps<'li'>) {
	return (
		<li
			data-slot="sidebar-menu-item"
			data-sidebar="menu-item"
			className={cn('group/menu-item relative', className)}
			{...props}
		/>
	);
}

const sidebarMenuButtonVariants = cva(
	'peer/menu-button group/menu-button flex w-full items-center gap-2 overflow-hidden rounded-md p-2 text-left text-sm ring-sidebar-ring outline-hidden transition-[width,height,padding] group-data-[collapsible=icon]:size-8! group-data-[collapsible=icon]:p-2! hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 active:bg-sidebar-accent active:text-sidebar-accent-foreground disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50 data-open:hover:bg-sidebar-accent data-open:hover:text-sidebar-accent-foreground data-active:bg-sidebar-accent data-active:font-medium data-active:text-sidebar-accent-foreground [&_svg]:size-4 [&_svg]:shrink-0 [&>span:last-child]:truncate',
	{
		variants: {
			variant: {
				default: 'hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
				outline:
					'bg-background shadow-[0_0_0_1px_var(--sidebar-border)] hover:bg-sidebar-accent hover:text-sidebar-accent-foreground hover:shadow-[0_0_0_1px_var(--sidebar-accent)]'
			},
			size: {
				default: 'h-8 text-sm',
				sm: 'h-7 text-xs',
				lg: 'h-12 text-sm group-data-[collapsible=icon]:p-0!'
			}
		},
		defaultVariants: {
			variant: 'default',
			size: 'default'
		}
	}
);

// `variant`/`size` carry no destructuring default — cva's `defaultVariants` fills
// them — and `isActive` is resolved in the body, because a default in the
// destructuring pattern bails the component out of the React Compiler.
function SidebarMenuButton({
	render,
	isActive,
	variant,
	size,
	className,
	...props
}: useRender.ComponentProps<'button'> &
	ComponentProps<'button'> & {
		isActive?: boolean;
	} & VariantProps<typeof sidebarMenuButtonVariants>) {
	return useRender({
		defaultTagName: 'button',
		props: mergeProps<'button'>(
			{ className: cn(sidebarMenuButtonVariants({ variant, size }), className) },
			props
		),
		render,
		state: {
			slot: 'sidebar-menu-button',
			sidebar: 'menu-button',
			size: size ?? 'default',
			active: isActive ?? false
		}
	});
}

export {
	Sidebar,
	SidebarContent,
	SidebarGroup,
	SidebarGroupLabel,
	SidebarHeader,
	SidebarInset,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	SidebarProvider,
	SidebarTrigger,
	useSidebar
};
