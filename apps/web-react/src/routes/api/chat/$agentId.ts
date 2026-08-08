import { createFileRoute } from '@tanstack/react-router';

import { proxyChatRequest } from '../../../lib/server/chat-proxy';

export const Route = createFileRoute('/api/chat/$agentId')({
	server: {
		handlers: {
			POST: ({ params, request }) => proxyChatRequest(params.agentId, request)
		}
	}
});
