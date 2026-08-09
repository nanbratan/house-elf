import { useId } from 'react';

export interface ThinkingRowProps {
	thinking: boolean;
	onThinkingChange: (thinking: boolean) => void;
}

/** The footer's thinking switch. Sits outside the cmdk list so arrow-key navigation never treats it as a model. */
export function ThinkingRow({ thinking, onThinkingChange }: ThinkingRowProps) {
	const labelId = `${useId()}-thinking-label`;

	return (
		<div className="flex items-center gap-3 border-t border-border px-4 py-3">
			<span className="flex-1">
				<span id={labelId} className="block text-sm">
					Thinking
				</span>
				<span className="block text-xs text-faint">
					Works through the problem first. Slower, and costs more.
				</span>
			</span>
			<button
				type="button"
				role="switch"
				aria-checked={thinking}
				aria-labelledby={labelId}
				onClick={() => {
					onThinkingChange(!thinking);
				}}
				className={`h-5 w-9 shrink-0 rounded-full p-0.5 transition-colors ${
					thinking ? 'bg-primary' : 'bg-border'
				}`}
			>
				<span
					className={`block size-4 rounded-full bg-white transition-transform ${
						thinking ? 'translate-x-4' : ''
					}`}
				/>
			</button>
		</div>
	);
}
