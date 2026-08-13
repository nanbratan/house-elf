import { createFileRoute } from '@tanstack/react-router';

import { ChatView } from '../../lib/components/chat/ChatView.tsx';
import { getModelCatalog } from '../../lib/server/model-catalog.functions.ts';

export const Route = createFileRoute('/c/new')({
	loader: async () => ({ modelCatalog: await getModelCatalog() }),
	component: NewConversationPage
});

// Until there is a route that names one, every new conversation is with the
// general agent.
const agentId = 'general';

function NewConversationPage() {
	const { modelCatalog } = Route.useLoaderData();

	return (
		<div className="h-full min-h-0">
			{/* Keyed so a different agent is a different conversation: the runtime
			    below holds the thread, and it must not survive the switch. */}
			<ChatView key={agentId} agentId={agentId} modelCatalog={modelCatalog} />
		</div>
	);
}
