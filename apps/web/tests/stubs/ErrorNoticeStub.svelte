<script lang="ts">
	// Enough of the real notice for `ChatView` to prove what it owes it: the
	// failure it was given, and a way to ask for the retry it promised.
	let { error, onretry }: { error: Error; onretry: () => void } = $props();
</script>

<div data-testid="error-notice">
	{error.message}
	<button type="button" onclick={onretry}>Retry</button>
</div>
