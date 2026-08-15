import { Select as SelectPrimitive } from '@base-ui/react/select';
import { CheckIcon, ChevronDownIcon, ChevronUpIcon } from 'lucide-react';

import { cn } from '../../utils/cn.ts';

// Aliased rather than wrapped: `Root` renders no element of its own, and a
// wrapper would have to restate its two type parameters to keep `multiple`
// narrowing `value` to an array.
const Select = SelectPrimitive.Root;

// No `data-placeholder:` colour and no background of its own. Base UI flags the
// trigger `data-placeholder` for as long as nothing is selected, which for a
// filter is its whole resting state; the registry's rule for it lands later in
// the stylesheet than `hover:` at equal specificity, so it silently cancels a
// caller's hover colour and the control reads as disabled. The rule only ever
// existed to grey `SelectValue`'s placeholder text, which this file does not
// render. Background is likewise the caller's business — `ComboboxTrigger` sets
// none either, and a filter pill sitting beside one must not be filled alone.
function SelectTrigger({ className, children, ...props }: SelectPrimitive.Trigger.Props) {
	return (
		<SelectPrimitive.Trigger
			data-slot="select-trigger"
			className={cn(
				'flex h-8 w-fit items-center justify-between gap-1.5 rounded-lg border border-input py-2 pr-2 pl-2.5 text-sm whitespace-nowrap transition-colors outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0',
				className
			)}
			{...props}
		>
			{children}
		</SelectPrimitive.Trigger>
	);
}

// The positioner's defaults are resolved in the body rather than in the
// destructuring pattern: a default there bails the whole component out of the
// React Compiler (see the note in `button.tsx`).
function SelectContent({
	align,
	alignOffset,
	alignItemWithTrigger,
	side,
	sideOffset,
	className,
	children,
	...props
}: SelectPrimitive.Popup.Props &
	Pick<
		SelectPrimitive.Positioner.Props,
		'align' | 'alignOffset' | 'alignItemWithTrigger' | 'side' | 'sideOffset'
	>) {
	const alignedWithTrigger = alignItemWithTrigger ?? true;

	return (
		<SelectPrimitive.Portal>
			<SelectPrimitive.Positioner
				className="isolate z-50 outline-none"
				align={align ?? 'center'}
				alignOffset={alignOffset ?? 0}
				alignItemWithTrigger={alignedWithTrigger}
				side={side ?? 'bottom'}
				sideOffset={sideOffset ?? 4}
			>
				<SelectPrimitive.Popup
					data-slot="select-content"
					data-align-trigger={alignedWithTrigger}
					className={cn(
						'relative isolate z-50 max-h-[min(var(--available-height),18rem)] w-(--anchor-width) min-w-36 origin-(--transform-origin) overflow-x-hidden overflow-y-auto overscroll-none rounded-lg bg-popover p-1 text-popover-foreground shadow-md ring-1 ring-foreground/10 duration-100 outline-none data-[align-trigger=true]:animate-none data-[side=bottom]:slide-in-from-top-2 data-[side=inline-end]:slide-in-from-left-2 data-[side=inline-start]:slide-in-from-right-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95',
						className
					)}
					{...props}
				>
					<SelectScrollUpArrow />
					<SelectPrimitive.List>{children}</SelectPrimitive.List>
					<SelectScrollDownArrow />
				</SelectPrimitive.Popup>
			</SelectPrimitive.Positioner>
		</SelectPrimitive.Portal>
	);
}

function SelectItem({ className, children, ...props }: SelectPrimitive.Item.Props) {
	return (
		<SelectPrimitive.Item
			data-slot="select-item"
			className={cn(
				"relative flex w-full cursor-default items-center gap-1.5 rounded-md py-1 pr-8 pl-1.5 text-sm outline-hidden select-none focus:bg-accent focus:text-accent-foreground focus:**:text-accent-foreground data-disabled:pointer-events-none data-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
				className
			)}
			{...props}
		>
			<SelectPrimitive.ItemText className="flex flex-1 shrink-0 items-center gap-2 whitespace-nowrap">
				{children}
			</SelectPrimitive.ItemText>
			<SelectPrimitive.ItemIndicator
				render={
					<span className="pointer-events-none absolute right-2 flex size-4 items-center justify-center" />
				}
			>
				<CheckIcon />
			</SelectPrimitive.ItemIndicator>
		</SelectPrimitive.Item>
	);
}

function SelectScrollUpArrow({ className, ...props }: SelectPrimitive.ScrollUpArrow.Props) {
	return (
		<SelectPrimitive.ScrollUpArrow
			data-slot="select-scroll-up-arrow"
			className={cn(
				"top-0 z-10 flex w-full cursor-default items-center justify-center bg-popover py-1 [&_svg:not([class*='size-'])]:size-4",
				className
			)}
			{...props}
		>
			<ChevronUpIcon />
		</SelectPrimitive.ScrollUpArrow>
	);
}

function SelectScrollDownArrow({ className, ...props }: SelectPrimitive.ScrollDownArrow.Props) {
	return (
		<SelectPrimitive.ScrollDownArrow
			data-slot="select-scroll-down-arrow"
			className={cn(
				"bottom-0 z-10 flex w-full cursor-default items-center justify-center bg-popover py-1 [&_svg:not([class*='size-'])]:size-4",
				className
			)}
			{...props}
		>
			<ChevronDownIcon />
		</SelectPrimitive.ScrollDownArrow>
	);
}

export { Select, SelectContent, SelectItem, SelectTrigger };
