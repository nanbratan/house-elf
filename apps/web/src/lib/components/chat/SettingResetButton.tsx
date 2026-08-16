import { RotateCcwIcon } from 'lucide-react';

export interface SettingResetButtonProps {
	/** What is being returned, for the accessible name — e.g. `thinking effort`. */
	setting: string;
	onReset: () => void;
}

/**
 * Returns one setting to its default.
 *
 * Rendered only by a field whose current value differs from its default, so its
 * presence is itself the signal that something was changed. There is no bulk
 * reset: the panel's settings cost different amounts and are rarely wrong
 * together.
 */
export function SettingResetButton({ setting, onReset }: SettingResetButtonProps) {
	function handleClick() {
		onReset();
	}

	return (
		<button
			type="button"
			aria-label={`Reset ${setting}`}
			onClick={handleClick}
			className="-my-1 rounded-md p-1 text-faint transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-hidden"
		>
			<RotateCcwIcon className="size-3" aria-hidden="true" />
		</button>
	);
}
