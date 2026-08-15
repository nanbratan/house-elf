import { Combobox as ComboboxPrimitive } from '@base-ui/react/combobox';
import { CheckIcon } from 'lucide-react';

import { cn } from '../../utils/cn.ts';
import { InputGroup, InputGroupInput } from './input-group.tsx';

// Aliased rather than wrapped: `Root` renders no element of its own, and a
// wrapper would have to restate its two type parameters to keep `multiple`
// narrowing `value` to an array.
const Combobox = ComboboxPrimitive.Root;

function ComboboxTrigger({ className, ...props }: ComboboxPrimitive.Trigger.Props) {
	return (
		<ComboboxPrimitive.Trigger
			data-slot="combobox-trigger"
			className={cn('[&_svg]:pointer-events-none [&_svg]:shrink-0', className)}
			{...props}
		/>
	);
}

/**
 * The search field, which belongs *inside* the popup.
 *
 * With `multiple`, picking an item while a query is typed closes the popup when
 * the input sits outside it, and merely clears the query when it sits inside
 * (`AriaCombobox`'s item-press handler branches on `inputInsidePopup`). Only the
 * second is right for a filter, so this is not a placement preference.
 */
function ComboboxInput({ className, ...props }: ComboboxPrimitive.Input.Props) {
	return (
		<InputGroup
			// No focus ring: this field holds focus for as long as the popup is open,
			// so a ring marks nothing — it is just a second border inside one.
			className={cn(
				'w-auto has-[[data-slot=input-group-control]:focus-visible]:border-input has-[[data-slot=input-group-control]:focus-visible]:ring-0',
				className
			)}
		>
			<ComboboxPrimitive.Input render={<InputGroupInput />} {...props} />
		</InputGroup>
	);
}

/**
 * The search field without the `InputGroup` around it, for a caller that owns
 * the group itself — one with its own addons, count or clear button.
 */
function ComboboxInputControl(props: ComboboxPrimitive.Input.Props) {
	return <ComboboxPrimitive.Input render={<InputGroupInput />} {...props} />;
}

// The positioner's defaults are resolved in the body rather than in the
// destructuring pattern: a default there bails the whole component out of the
// React Compiler (see the note in `button.tsx`).
function ComboboxContent({
	align,
	alignOffset,
	side,
	sideOffset,
	className,
	...props
}: ComboboxPrimitive.Popup.Props &
	Pick<ComboboxPrimitive.Positioner.Props, 'align' | 'alignOffset' | 'side' | 'sideOffset'>) {
	return (
		<ComboboxPrimitive.Portal>
			<ComboboxPrimitive.Positioner
				className="isolate z-50 outline-none"
				align={align ?? 'start'}
				alignOffset={alignOffset ?? 0}
				side={side ?? 'bottom'}
				sideOffset={sideOffset ?? 6}
			>
				<ComboboxPrimitive.Popup
					data-slot="combobox-content"
					className={cn(
						'group/combobox-content relative isolate z-50 max-h-(--available-height) w-(--anchor-width) max-w-(--available-width) min-w-[calc(var(--anchor-width)+--spacing(7))] origin-(--transform-origin) overflow-hidden rounded-lg bg-popover text-popover-foreground shadow-md ring-1 ring-foreground/10 duration-100 outline-none data-[side=bottom]:slide-in-from-top-2 data-[side=inline-end]:slide-in-from-left-2 data-[side=inline-start]:slide-in-from-right-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 *:data-[slot=input-group]:m-1 *:data-[slot=input-group]:mb-0 *:data-[slot=input-group]:h-8 *:data-[slot=input-group]:border-input/30 *:data-[slot=input-group]:bg-input/30 *:data-[slot=input-group]:shadow-none data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95',
						className
					)}
					{...props}
				/>
			</ComboboxPrimitive.Positioner>
		</ComboboxPrimitive.Portal>
	);
}

function ComboboxList({ className, ...props }: ComboboxPrimitive.List.Props) {
	return (
		<ComboboxPrimitive.List
			data-slot="combobox-list"
			className={cn(
				'no-scrollbar max-h-[min(18rem,var(--available-height))] scroll-py-1 overflow-y-auto overscroll-none p-1 data-empty:p-0',
				className
			)}
			{...props}
		/>
	);
}

function ComboboxItem({ className, children, ...props }: ComboboxPrimitive.Item.Props) {
	return (
		<ComboboxPrimitive.Item
			data-slot="combobox-item"
			className={cn(
				"relative flex w-full cursor-default items-center gap-1.5 rounded-md py-1 pr-8 pl-1.5 text-sm outline-hidden select-none data-highlighted:bg-accent data-highlighted:text-accent-foreground data-highlighted:**:text-accent-foreground data-disabled:pointer-events-none data-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
				className
			)}
			{...props}
		>
			{children}
			<ComboboxPrimitive.ItemIndicator
				render={
					<span className="pointer-events-none absolute right-2 flex size-4 items-center justify-center" />
				}
			>
				<CheckIcon />
			</ComboboxPrimitive.ItemIndicator>
		</ComboboxPrimitive.Item>
	);
}

/**
 * The item without the check indicator or the padding that reserves room for
 * it, for a row that lays out its own contents and marks selection itself.
 */
const ComboboxItemBase = ComboboxPrimitive.Item;

// Renders nothing of its own — it is the seam the root's filtering feeds, so
// there is no element here to style.
const ComboboxCollection = ComboboxPrimitive.Collection;

function ComboboxEmpty({ className, ...props }: ComboboxPrimitive.Empty.Props) {
	return (
		<ComboboxPrimitive.Empty
			data-slot="combobox-empty"
			className={cn(
				'hidden w-full justify-center py-2 text-center text-sm text-muted-foreground group-data-empty/combobox-content:flex',
				className
			)}
			{...props}
		/>
	);
}

export {
	Combobox,
	ComboboxCollection,
	ComboboxContent,
	ComboboxEmpty,
	ComboboxInput,
	ComboboxInputControl,
	ComboboxItem,
	ComboboxItemBase,
	ComboboxList,
	ComboboxTrigger
};
