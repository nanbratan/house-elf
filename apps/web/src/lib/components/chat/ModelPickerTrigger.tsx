import { DialogTrigger } from '../ui/dialog.tsx';

export interface ModelPickerTriggerProps {
	/** The current model's label, or null when none is chosen yet. */
	label: string | null;
	thinking: boolean;
}

/** The composer's model button: what is chosen now, and how to change it. */
export function ModelPickerTrigger({ label, thinking }: ModelPickerTriggerProps) {
	return (
		<DialogTrigger
			aria-label={`Choose model. Current model: ${label ?? 'none'}${
				thinking ? ', thinking on' : ''
			}`}
			// `px-3` matches the composer textarea's own padding, so the model's name
			// starts on the same vertical line as the placeholder above it.
			className="flex h-8 min-w-0 items-center gap-1.5 rounded-md px-3 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
		>
			<span className="max-w-32 truncate">{label ?? 'Choose model'}</span>
			{thinking ? (
				// Named on the trigger so an expensive setting is never hidden.
				<span className="shrink-0 text-faint">Thinking</span>
			) : null}
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
