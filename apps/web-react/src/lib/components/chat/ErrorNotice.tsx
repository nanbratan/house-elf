import { Button } from '@/registry/default/ui/button';

export interface ErrorNoticeProps {
	error: Error;
	onRetry: () => void;
}

export function ErrorNotice({ error, onRetry }: ErrorNoticeProps) {
	return (
		<div role="alert" className="mb-6 rounded-lg border border-border px-3 py-2 text-sm">
			<p>That reply did not arrive.</p>
			<p className="mt-0.5 text-xs break-words text-faint">{error.message}</p>
			<Button className="mt-2" onClick={onRetry} size="xs" type="button" variant="outline">
				Try again
			</Button>
		</div>
	);
}
