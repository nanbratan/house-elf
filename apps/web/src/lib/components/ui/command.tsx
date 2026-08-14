import { Command as CommandPrimitive } from 'cmdk';
import type { ComponentProps } from 'react';

import { cn } from '../../utils/cn.ts';

// No `p-1` from the registry copy: the only consumer renders this inside a
// `p-0` dialog and pads its own header and list, so the extra ring of padding
// would show up as a visible inset around the whole panel.
function Command({ className, ...props }: ComponentProps<typeof CommandPrimitive>) {
	return (
		<CommandPrimitive
			data-slot="command"
			className={cn(
				'flex size-full flex-col overflow-hidden rounded-xl! bg-popover text-popover-foreground',
				className
			)}
			{...props}
		/>
	);
}

function CommandList({ className, ...props }: ComponentProps<typeof CommandPrimitive.List>) {
	return (
		<CommandPrimitive.List
			data-slot="command-list"
			className={cn(
				'max-h-72 scroll-py-1 overflow-x-hidden overflow-y-auto overscroll-none outline-none',
				className
			)}
			{...props}
		/>
	);
}

function CommandEmpty({ className, ...props }: ComponentProps<typeof CommandPrimitive.Empty>) {
	return (
		<CommandPrimitive.Empty
			data-slot="command-empty"
			className={cn('py-6 text-center text-sm', className)}
			{...props}
		/>
	);
}

function CommandGroup({ className, ...props }: ComponentProps<typeof CommandPrimitive.Group>) {
	return (
		<CommandPrimitive.Group
			data-slot="command-group"
			className={cn(
				'overflow-hidden p-1 text-foreground **:[[cmdk-group-heading]]:px-2 **:[[cmdk-group-heading]]:py-1.5 **:[[cmdk-group-heading]]:text-xs **:[[cmdk-group-heading]]:font-medium **:[[cmdk-group-heading]]:text-muted-foreground',
				className
			)}
			{...props}
		/>
	);
}

// `data-[selected=true]`, not Tailwind's `data-selected`: cmdk writes the
// attribute on every item, `"false"` included, so presence alone matches the
// unselected rows too.
function CommandItem({ className, ...props }: ComponentProps<typeof CommandPrimitive.Item>) {
	return (
		<CommandPrimitive.Item
			data-slot="command-item"
			className={cn(
				"relative flex cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-hidden select-none in-data-[slot=dialog-content]:rounded-lg! data-[disabled=true]:pointer-events-none data-[disabled=true]:opacity-50 data-[selected=true]:bg-muted data-[selected=true]:text-foreground [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 data-[selected=true]:*:[svg]:text-foreground",
				className
			)}
			{...props}
		/>
	);
}

export { Command, CommandEmpty, CommandGroup, CommandItem, CommandList };
