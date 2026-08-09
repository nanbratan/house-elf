import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/c/$id')({
	component: ConversationPlaceholder
});

function ConversationPlaceholder() {
	const { id } = Route.useParams();

	return (
		<div className="mx-auto max-w-2xl px-6 py-10">
			<h1 className="text-lg font-semibold">Conversation {id}</h1>
			<p className="mt-2 text-sm text-muted-foreground">
				Placeholder. The chat transcript and composer arrive in M1.
			</p>
		</div>
	);
}
