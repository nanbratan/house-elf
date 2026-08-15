import { Dialog as SheetPrimitive } from '@base-ui/react/dialog';
import { XIcon } from 'lucide-react';

import { cn } from '../../utils/cn.ts';
import { Button } from './button.tsx';

function Sheet({ ...props }: SheetPrimitive.Root.Props) {
	return <SheetPrimitive.Root data-slot="sheet" {...props} />;
}

// `showCloseButton` is resolved in the body rather than defaulted in the
// destructuring pattern: a default there bails the whole component out of the
// React Compiler (see the note in `button.tsx`).
function SheetContent({
	className,
	children,
	side,
	showCloseButton,
	...props
}: SheetPrimitive.Popup.Props & {
	side?: 'top' | 'right' | 'bottom' | 'left';
	showCloseButton?: boolean;
}) {
	const edge = side ?? 'right';
	const withClose = showCloseButton ?? true;

	return (
		<SheetPrimitive.Portal data-slot="sheet-portal">
			<SheetPrimitive.Backdrop
				data-slot="sheet-overlay"
				className="fixed inset-0 z-50 bg-black/10 transition-opacity duration-150 data-ending-style:opacity-0 data-starting-style:opacity-0 supports-backdrop-filter:backdrop-blur-xs"
			/>
			<SheetPrimitive.Popup
				data-slot="sheet-content"
				data-side={edge}
				// Registry ships `data-[side=…]:w-3/4 sm:max-w-sm` here. Those are dropped:
				// tailwind-merge does not dedupe a variant-prefixed class against the bare
				// `w-*` a caller passes, so both would survive and the variant would win —
				// silently overriding every caller's width. Width is the caller's to set.
				className={cn(
					'fixed z-50 flex flex-col gap-4 bg-popover bg-clip-padding text-sm text-popover-foreground shadow-lg transition duration-200 ease-in-out data-ending-style:opacity-0 data-starting-style:opacity-0 data-[side=bottom]:inset-x-0 data-[side=bottom]:bottom-0 data-[side=bottom]:h-auto data-[side=bottom]:border-t data-[side=bottom]:data-ending-style:translate-y-[2.5rem] data-[side=bottom]:data-starting-style:translate-y-[2.5rem] data-[side=left]:inset-y-0 data-[side=left]:left-0 data-[side=left]:h-full data-[side=left]:border-r data-[side=left]:data-ending-style:translate-x-[-2.5rem] data-[side=left]:data-starting-style:translate-x-[-2.5rem] data-[side=right]:inset-y-0 data-[side=right]:right-0 data-[side=right]:h-full data-[side=right]:border-l data-[side=right]:data-ending-style:translate-x-[2.5rem] data-[side=right]:data-starting-style:translate-x-[2.5rem] data-[side=top]:inset-x-0 data-[side=top]:top-0 data-[side=top]:h-auto data-[side=top]:border-b data-[side=top]:data-ending-style:translate-y-[-2.5rem] data-[side=top]:data-starting-style:translate-y-[-2.5rem]',
					className
				)}
				{...props}
			>
				{children}
				{withClose ? (
					<SheetPrimitive.Close
						data-slot="sheet-close"
						render={<Button variant="ghost" className="absolute top-3 right-3" size="icon-sm" />}
					>
						<XIcon />
						<span className="sr-only">Close</span>
					</SheetPrimitive.Close>
				) : null}
			</SheetPrimitive.Popup>
		</SheetPrimitive.Portal>
	);
}

function SheetTitle({ className, ...props }: SheetPrimitive.Title.Props) {
	return (
		<SheetPrimitive.Title
			data-slot="sheet-title"
			className={cn('cn-font-heading text-base leading-none font-medium', className)}
			{...props}
		/>
	);
}

export { Sheet, SheetContent, SheetTitle };
