import { cjk } from '@streamdown/cjk';
import { code } from '@streamdown/code';
import { math } from '@streamdown/math';
import { StreamdownTextPrimitive } from '@assistant-ui/react-streamdown';

// Mermaid is deliberately absent: an enormous dependency for a chat whose bundle is
// already highlighter-dominated. Plugins are not auto-detected — an omitted one is an
// off one — so this object is the whole markdown feature set the assistant renders.
const streamdownPlugins = { cjk, code, math };

/**
 * Assistant markdown, for both text and reasoning parts.
 *
 * Takes no props: the primitive reads the part's text and streaming status from the
 * message-part context the surrounding `MessagePrimitive` establishes. That context is
 * also why there is no memo boundary here — a context read re-renders through `memo`
 * regardless, and Streamdown already memoises per markdown block, so a settled block is
 * not re-parsed as later tokens arrive.
 */
export function MarkdownText() {
	return (
		<StreamdownTextPrimitive
			className="size-full [&>*:first-child]:mt-0 [&>*:last-child]:mb-0"
			plugins={streamdownPlugins}
		/>
	);
}
