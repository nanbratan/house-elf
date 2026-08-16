import { Slider } from '../ui/slider.tsx';

export interface LevelSliderProps {
	/** The accessible name, since the visible label sits in the field header. */
	label: string;
	/** The levels in order, least to most. Must hold at least two. */
	levels: readonly string[];
	value: string;
	onChange: (level: string) => void;
}

/**
 * An ordered list of levels as a slider.
 *
 * The slider carries an index, never the level itself: the levels are words and
 * the gaps between them are not numbers.
 */
export function LevelSlider({ label, levels, value, onChange }: LevelSliderProps) {
	const index = levels.indexOf(value);

	// base-ui calls this with (value, eventDetails); only the first is our contract.
	function handleValueChange(next: number) {
		const level = levels[next];
		if (level !== undefined) onChange(level);
	}

	return (
		<Slider
			label={label}
			min={0}
			max={levels.length - 1}
			step={1}
			value={index === -1 ? 0 : index}
			onValueChange={handleValueChange}
			// Otherwise the thumb announces the bare index.
			valueText={value}
		/>
	);
}
