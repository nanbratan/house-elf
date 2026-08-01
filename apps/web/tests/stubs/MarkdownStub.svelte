<script lang="ts">
	// Stands in for the real Markdown component so `MessagePart` can be tested on
	// the only thing it does: choosing a child and handing it the right props.
	const props: Record<string, unknown> = $props();
</script>

<div data-testid="markdown" data-props={JSON.stringify(props)}></div>
