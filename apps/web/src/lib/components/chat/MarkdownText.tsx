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
 * The primitive reads the part's text from the message-part context the surrounding
 * `MessagePrimitive` establishes; there is no memo boundary here because a context read
 * re-renders through `memo` regardless, and Streamdown already memoises per markdown
 * block, so a settled block is not re-parsed as later tokens arrive.
 *
 * `isStreaming` drives `mode`: `"static"` (once the part has finished streaming) takes
 * Streamdown's non-memoised render path, which is what actually clears the per-character
 * `animated` spans afterwards — passing `isAnimating={false}` alone left stale spans in
 * the DOM, since that prop only gates whether new spans are added, not whether existing
 * ones are torn down.
 */
export function MarkdownText({ isStreaming }: { isStreaming: boolean }) {
	return (
		<StreamdownTextPrimitive
			className="size-full [&>*:first-child]:mt-0 [&>*:last-child]:mb-0"
			plugins={streamdownPlugins}
			mode={isStreaming ? 'streaming' : 'static'}
			animated={{ animation: 'fadeIn', sep: 'char' }}
		/>
	);
}
