import { CircleAlertIcon, RefreshCwIcon } from 'lucide-react';

export interface ErrorStateProps {
	title: string;
	detail: string;
	onRetry: () => void;
}

/**
 * A turn that failed, and the offer to run it again.
 *
 * The registry's `retrying` branch is pruned rather than wired up: `regenerate()`
 * clears the runtime error synchronously, so the caller unmounts this component on the
 * click and the branch could never render. The assistant message shows its own
 * indicator for the retry that follows.
 */
export function ErrorState({ title, detail, onRetry }: ErrorStateProps) {
	return (
		<div
			data-slot="error-state"
			role="alert"
			className="flex w-full animate-in items-start gap-2.5 rounded-2xl bg-destructive/10 px-4 py-3 text-sm duration-300 fade-in motion-reduce:animate-none"
		>
			<CircleAlertIcon className="mt-0.5 size-4 shrink-0 text-destructive/80" />
			<div className="min-w-0">
				<p className="font-medium text-destructive">{title}</p>
				<p className="mt-0.5 text-[13px] leading-snug wrap-break-word text-destructive/60">
					{detail}
				</p>
			</div>
			<button
				type="button"
				onClick={onRetry}
				className="ms-auto flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium text-destructive transition-colors hover:bg-destructive/10"
			>
				<RefreshCwIcon className="size-3" />
				Retry
			</button>
		</div>
	);
}
