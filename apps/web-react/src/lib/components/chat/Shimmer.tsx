export interface ShimmerProps {
	children: string;
}

export function Shimmer({ children }: ShimmerProps) {
	return <span className="shimmer-text">{children}</span>;
}
