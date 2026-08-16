import type { SelectableModel } from '@house-elf/shared';
import { AuiIf, ComposerPrimitive, useAuiState } from '@assistant-ui/react';

import type { StoredModelSettings } from '../../utils/stored-model-settings.ts';
import {
	ComposerActions,
	ComposerBar,
	ComposerSend,
	ComposerToolbar
} from '../elements/composer.tsx';
import { ModelPicker } from './ModelPicker.tsx';
import { SettingsPicker } from './SettingsPicker.tsx';

export interface ComposerProps {
	models: readonly SelectableModel[];
	selectedModel: SelectableModel;
	onModelSelect: (modelId: string) => void;
	/** False until the settings restore lands, when the settings trigger is a skeleton. */
	settingsRestored: boolean;
	storedSettings: StoredModelSettings;
	onSettingChange: <Field extends keyof StoredModelSettings>(
		field: Field,
		value: StoredModelSettings[Field]
	) => void;
}

/**
 * The draft and the controls that shape it, wired to the runtime `ChatView`
 * provides.
 *
 * The draft itself, Enter/Shift+Enter, IME composition, autosize and the
 * empty-draft guard all belong to `ComposerPrimitive`; only the two triggers are
 * ours — which model, and how it answers. Nothing is attached to the message
 * here: what a request carries is settled by the transport at send time, so a
 * regenerate sends the same settings as a first ask.
 */
export function Composer({
	models,
	selectedModel,
	onModelSelect,
	settingsRestored,
	storedSettings,
	onSettingChange
}: ComposerProps) {
	// Drives the send button's resting colour only — whether it can be pressed is
	// the primitive's own `disabled`, from the same emptiness.
	const isEmpty = useAuiState((state) => state.composer.isEmpty);

	return (
		// No rule above the card — the viewport footer holding it is opaque, which is
		// what separates it from the transcript. Only the card is centred and
		// width-capped.
		<div className="px-4 pb-4">
			<ComposerPrimitive.Root className="mx-auto max-w-3xl">
				<ComposerBar>
					{/*
					 * No `render`/`asChild`: passing either swaps out the primitive's own
					 * TextareaAutosize, and with it the autosize this cap bounds. The
					 * classes are the registry input's, plus what a textarea needs.
					 */}
					<ComposerPrimitive.Input
						aria-label="Message"
						// Escape would otherwise abort a running turn: `canCancel` is
						// permanently true for the AI-SDK runtime, which has an `onCancel`.
						cancelOnEscape={false}
						className="max-h-48 min-h-11 w-full resize-none bg-transparent px-3 py-2.5 text-[15px] caret-blue-500 outline-none placeholder:text-foreground/35 dark:caret-blue-400"
						placeholder="Send a message…"
						// A textarea defaults to two rows, which is what the server sends;
						// autosize then collapses it to one on hydration and the whole bar
						// jumps. One row is what it settles at, so it is what ships.
						rows={1}
					/>

					<ComposerToolbar>
						{/*
						 * One group, not two toolbar children: the toolbar spaces its
						 * children apart, so a second bare child would be pushed to the
						 * middle. Both triggers answer "what will this send", so they
						 * belong together at the start.
						 */}
						<div className="flex min-w-0 items-center gap-0.5">
							<ModelPicker
								models={models}
								onSelect={onModelSelect}
								selectedModelId={selectedModel.id}
							/>

							<SettingsPicker
								model={selectedModel}
								onChange={onSettingChange}
								restored={settingsRestored}
								stored={storedSettings}
							/>
						</div>

						<ComposerActions>
							{/*
							 * Send and Stop are mutually exclusive on the thread's state, not
							 * on their own: `ComposerPrimitive.Cancel` is enabled whenever the
							 * runtime can cancel at all, which for this one is always.
							 */}
							<AuiIf condition={(state) => !state.thread.isRunning}>
								<ComposerPrimitive.Send
									render={<ComposerSend idle={isEmpty} streaming={false} />}
								/>
							</AuiIf>

							<AuiIf condition={(state) => state.thread.isRunning}>
								<ComposerPrimitive.Cancel render={<ComposerSend idle={false} streaming />} />
							</AuiIf>
						</ComposerActions>
					</ComposerToolbar>
				</ComposerBar>
			</ComposerPrimitive.Root>
		</div>
	);
}
