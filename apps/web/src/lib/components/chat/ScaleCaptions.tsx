export interface ScaleCaptionsProps {
	/** What the leftmost end of the scale buys. */
	minLabel: string;
	/** What the rightmost end buys. */
	maxLabel: string;
}

/** Names which way a slider runs, which the track alone does not say. */
export function ScaleCaptions({ minLabel, maxLabel }: ScaleCaptionsProps) {
	return (
		<div aria-hidden="true" className="flex items-center justify-between text-[11px] text-faint">
			<span>{minLabel}</span>
			<span>{maxLabel}</span>
		</div>
	);
}
