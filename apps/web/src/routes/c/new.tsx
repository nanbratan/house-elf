import { createFileRoute } from '@tanstack/react-router';

import { ChatView } from '../../lib/components/chat/ChatView.tsx';
import { getModelCatalog } from '../../lib/server/model-catalog.functions.ts';

export const Route = createFileRoute('/c/new')({
	loader: async () => ({ modelCatalog: await getModelCatalog() }),
	component: NewConversationPage
});

function NewConversationPage() {
	const { modelCatalog } = Route.useLoaderData();

	return (
		<div className="h-full min-h-0">
			<ChatView agentId="general" modelCatalog={modelCatalog} />
		</div>
	);
}
