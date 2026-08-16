/**
 * The chat route, built on `handleChatStream` rather than `chatRoute`.
 *
 * `chatRoute` spreads the request body into `agent.stream()`
 * (`params: { ...params, … }`), which is what house-elf-2ou exists to stop.
 * This builds the params itself and spreads nothing. See chat-request.ts for
 * what a request may name.
 *
 * `handleChatStream` is the same function `chatRoute` calls, exported beside it
 * and taking the same `sendReasoning` / `sendSources` / `onError` — so this
 * changes what the agent is asked, not how the stream behaves.
 */

import { handleChatStream } from '@mastra/ai-sdk';
import type { ChatStreamHandlerParams } from '@mastra/ai-sdk';
import type { MastraModelConfig } from '@mastra/core/llm';
import type { Mastra } from '@mastra/core/mastra';
import type { RequestContext } from '@mastra/core/request-context';
import { registerApiRoute } from '@mastra/core/server';
import { createUIMessageStreamResponse } from 'ai';

import type { ChatRequest } from './chat-request';
import { chatRequestSchema, describeRefusal } from './chat-request';
import { UnsupportedSettingError, chatSettingsProviderOptions } from './chat-settings';
import { describeChatError } from './chat-error';
import { logger } from './logger';
import { routerModelId } from './model-router';
import { UnknownModelError, resolveModel } from './models';
import { CatalogUnavailableError } from './openrouter-catalog';

export interface ChatRequestOptions {
	request: Request;
	mastra: Mastra;
	agentId: string;
	/**
	 * The server's own context for this request, carrying whatever Mastra's
	 * middleware put there. Forwarded untouched.
	 */
	requestContext: RequestContext;
}

/**
 * What one turn asks of the agent.
 *
 * `model` is declared on `agent.stream()`'s overloads rather than on
 * `ChatStreamHandlerParams`, so the type is named here: excess-property
 * checking only fires on fresh object literals.
 */
type ChatStreamParams = ChatStreamHandlerParams & { model: MastraModelConfig };

/**
 * Resolves what the request named into what the agent is asked.
 *
 * The client names a catalog id; the provider is addressed by the router id. A
 * string from a browser must not reach a provider by being prefixed.
 */
async function chatStreamParams(
	{ messages, trigger, system, settings }: ChatRequest,
	{ request, requestContext }: Pick<ChatRequestOptions, 'request' | 'requestContext'>
): Promise<ChatStreamParams> {
	const model = await resolveModel(settings.model);

	return {
		messages,
		trigger,
		system,
		requestContext,
		model: routerModelId(model),
		providerOptions: chatSettingsProviderOptions(model, settings),
		// `chatRoute` wires this up itself. Without it the provider keeps
		// generating — and being billed — after the user presses stop.
		abortSignal: request.signal
	};
}

/**
 * The refusals a well-formed request can still earn. Anything not named here is
 * a fault, and is left to the caller to rethrow as one.
 */
function refusalResponse(error: unknown): Response | undefined {
	if (error instanceof UnknownModelError || error instanceof UnsupportedSettingError) {
		return Response.json({ error: error.message }, { status: 400 });
	}
	if (error instanceof CatalogUnavailableError) {
		// The request is fine; the server cannot currently say whether the model
		// it names exists, and guessing would mean billing an unvalidated id.
		return Response.json({ error: error.message }, { status: 503 });
	}
	return undefined;
}

/**
 * Takes the request rather than Hono's context: @mastra/core bundles its own
 * copy of Hono's types, so a context typed against the installed one is not
 * assignable to what `registerApiRoute` expects.
 */
export async function handleChatRequest({
	request,
	mastra,
	agentId,
	requestContext
}: ChatRequestOptions): Promise<Response> {
	let body: unknown;
	try {
		body = await request.json();
	} catch {
		return Response.json({ error: 'Request body must be JSON.' }, { status: 400 });
	}

	const parsed = chatRequestSchema.safeParse(body);
	if (!parsed.success) {
		return Response.json({ error: describeRefusal(parsed.error) }, { status: 400 });
	}

	try {
		const stream = await handleChatStream({
			mastra,
			agentId,
			// The stream shape ai@7 reads. Left to its default this is `v5`, whose
			// types come from an older copy of the SDK and force an assertion on
			// every message crossing into it.
			version: 'v6',
			sendReasoning: true,
			sendSources: true,
			// The default serializer streams the provider's error to the browser,
			// stack trace and upstream URL included. Detail belongs in the log.
			onError: (error) => {
				logger.error('Chat generation failed', { error });
				return describeChatError(error);
			},
			params: await chatStreamParams(parsed.data, { request, requestContext })
		});

		return createUIMessageStreamResponse({ stream });
	} catch (error) {
		const refusal = refusalResponse(error);
		if (refusal) return refusal;
		throw error;
	}
}

export const chatStreamRoute = registerApiRoute('/chat/:agentId', {
	method: 'POST',
	handler: (context) =>
		handleChatRequest({
			request: context.req.raw,
			mastra: context.get('mastra'),
			agentId: context.req.param('agentId'),
			requestContext: context.get('requestContext')
		})
});
