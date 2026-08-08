import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/c/new')({
	component: NewConversationPlaceholder
});

function NewConversationPlaceholder() {
	return (
		<div className="mx-auto max-w-2xl px-6 py-10">
			<h1 className="text-lg font-semibold">New conversation</h1>
			<p className="mt-2 text-sm text-muted-foreground">
				Placeholder. The composer and chat transcript arrive in M1.
			</p>
		</div>
	);
}
