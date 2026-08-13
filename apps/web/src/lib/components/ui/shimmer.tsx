import { cn } from '../../utils/cn.ts';

export interface ShimmerProps {
	children: string;
	className?: string;
	/** Sweep duration in seconds. */
	duration?: number;
	/** Highlight half-width, in px per character. */
	spread?: number;
}

export function Shimmer({ children, className, duration = 2, spread = 2 }: ShimmerProps) {
	return (
		<p
			className={cn(
				'inline-block shimmer text-muted-foreground shimmer-angle-0 shimmer-color-background',
				className
			)}
			style={{
				'--shimmer-duration': `${String(duration)}s`,
				'--shimmer-spread': `${String(children.length * spread)}px`
			}}
		>
			{children}
		</p>
	);
}
