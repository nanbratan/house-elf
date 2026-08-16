import { Slider as SliderPrimitive } from '@base-ui/react/slider';

import { cn } from '../../utils/cn.ts';

export interface SliderProps extends SliderPrimitive.Root.Props<number> {
	/**
	 * The accessible name. It goes on the thumb, not the root: the thumb renders
	 * the nested `input[type=range]` that carries the `slider` role, so a name on
	 * the root would label a plain `div` and leave the control itself unnamed.
	 */
	label: string;
	/**
	 * What the thumb should announce instead of the raw number — the level's own
	 * name, when the number is only an index into a list of words.
	 */
	valueText?: string;
}

/**
 * A single-thumb horizontal slider.
 *
 * The registry ships a range slider that maps over its values and keys the
 * thumbs by array index. One value is all this app asks for, so the map — and
 * the index key the house style bans — is gone rather than left unused, along
 * with the vertical orientation nothing here renders.
 */
export function Slider({ className, label, valueText, ...props }: SliderProps) {
	function ariaLabel(): string {
		return label;
	}

	function ariaValueText(): string {
		return valueText ?? '';
	}

	return (
		<SliderPrimitive.Root
			data-slot="slider"
			className={cn('w-full', className)}
			// The registry's `thumbAlignment="edge"` is not carried over: it hides the
			// thumb — and with it the `input[type=range]` that carries the slider role
			// — until it has measured the track, which is a flash in a browser and
			// permanent anywhere without layout. The default costs half a thumb of
			// overhang at either end.
			{...props}
		>
			<SliderPrimitive.Control className="relative flex w-full touch-none items-center select-none data-disabled:opacity-50">
				<SliderPrimitive.Track
					data-slot="slider-track"
					className="relative h-1 w-full grow overflow-hidden rounded-full bg-muted select-none"
				>
					<SliderPrimitive.Indicator
						data-slot="slider-indicator"
						className="h-full bg-primary select-none"
					/>
				</SliderPrimitive.Track>
				<SliderPrimitive.Thumb
					data-slot="slider-thumb"
					getAriaLabel={ariaLabel}
					// Both go on the thumb, not the root: the thumb renders the nested
					// input that carries the slider role and its value.
					getAriaValueText={valueText === undefined ? undefined : ariaValueText}
					className="relative block size-3 shrink-0 rounded-full border border-ring bg-background ring-ring/50 transition-[color,box-shadow] select-none after:absolute after:-inset-2 hover:ring-3 focus-visible:ring-3 focus-visible:outline-hidden active:ring-3"
				/>
			</SliderPrimitive.Control>
		</SliderPrimitive.Root>
	);
}
