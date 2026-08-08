import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/')({
	component: ConversationsPlaceholder
});

function ConversationsPlaceholder() {
	return (
		<div className="mx-auto max-w-2xl px-6 py-10">
			<h1 className="text-lg font-semibold">Conversations</h1>
			<p className="mt-2 text-sm text-muted-foreground">
				Placeholder. The real list arrives in M2, when threads are persisted.
			</p>
		</div>
	);
}
