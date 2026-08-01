<script lang="ts">
	import {
		getToolName,
		isReasoningUIPart,
		isTextUIPart,
		isToolUIPart,
		type UIDataTypes,
		type UIMessagePart,
		type UITools
	} from 'ai';

	import Markdown from './Markdown.svelte';
	import ReasoningPart from './ReasoningPart.svelte';
	import ToolCard from './ToolCard.svelte';

	// The stream carries more part types than any one milestone renders, and more
	// will arrive as providers add them. Anything unrecognised renders nothing
	// rather than throwing, so a new part type degrades to a gap, not a blank
	// message. `source` parts land here until something in the app emits one.
	let { part }: { part: UIMessagePart<UIDataTypes, UITools> } = $props();
</script>

{#if isTextUIPart(part)}
	<Markdown text={part.text} />
{:else if isReasoningUIPart(part)}
	<ReasoningPart text={part.text} streaming={part.state === 'streaming'} />
{:else if isToolUIPart(part)}
	<ToolCard name={getToolName(part)} {part} />
{/if}
