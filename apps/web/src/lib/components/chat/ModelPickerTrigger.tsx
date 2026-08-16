import { DialogTrigger } from '../ui/dialog.tsx';

export interface ModelPickerTriggerProps {
	/** The current model's label, or null when none is chosen yet. */
	label: string | null;
}

/**
 * The composer's model button: what is chosen now, and how to change it.
 *
 * It names no setting. Thinking used to be badged here, and now lives on the
 * settings trigger beside it, so that one trigger answers "which model" and the
 * other answers "how".
 */
export function ModelPickerTrigger({ label }: ModelPickerTriggerProps) {
	return (
		<DialogTrigger
			aria-label={`Choose model. Current model: ${label ?? 'none'}`}
			// `px-3` matches the composer textarea's own padding, so the model's name
			// starts on the same vertical line as the placeholder above it.
			className="flex h-8 min-w-0 items-center gap-1.5 rounded-md px-3 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
		>
			<span className="max-w-32 truncate">{label ?? 'Choose model'}</span>
			<svg
				className="size-3 shrink-0"
				viewBox="0 0 12 12"
				fill="none"
				stroke="currentColor"
				strokeWidth={1.5}
				aria-hidden="true"
			>
				<path d="m3 4.5 3 3 3-3" />
			</svg>
		</DialogTrigger>
	);
}
