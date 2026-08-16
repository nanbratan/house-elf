import type { SelectableModel } from '@house-elf/shared';

import { providerName } from '../../utils/model-list.ts';
import { DialogTrigger } from '../ui/dialog.tsx';
import { ProviderLogo } from './ProviderLogo.tsx';

export interface ModelPickerTriggerProps {
	/** The current model, or null when none is chosen yet. */
	model: SelectableModel | null;
}

/**
 * The composer's model button: what is chosen now, and how to change it.
 *
 * It names no setting. Thinking used to be badged here, and now lives on the
 * settings trigger beside it, so that one trigger answers "which model" and the
 * other answers "how".
 */
export function ModelPickerTrigger({ model }: ModelPickerTriggerProps) {
	return (
		<DialogTrigger
			aria-label={`Choose model. Current model: ${model?.label ?? 'none'}`}
			// `px-3` matches the composer textarea's own padding, so the model's name
			// starts on the same vertical line as the placeholder above it.
			className="flex h-8 min-w-0 items-center gap-1.5 rounded-md px-3 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
		>
			{model ? <ProviderLogo provider={providerName(model)} /> : null}
			<span className="max-w-32 truncate">{model?.label ?? 'Choose model'}</span>
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
