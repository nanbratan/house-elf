<script lang="ts">
	let { error, onretry }: { error: Error; onretry: () => void } = $props();
</script>

<!-- Inside the transcript rather than over it: the failure belongs to the exchange
     it interrupted, and a reader scrolling back should find it where the reply
     would have been. -->
<div role="alert" class="mb-6 rounded-lg border border-line px-3 py-2 text-sm">
	<p class="text-content">That reply did not arrive.</p>

	<!-- Kept, but second: the raw message is often something like "Failed to
	     fetch", which is worth having in a bug report and useless as an
	     explanation. -->
	<p class="mt-0.5 text-xs break-words text-faint">{error.message}</p>

	<!-- Asking again clears the error by itself — every new request resets it — so
	     there is nothing to dismiss and no stale warning to leave behind. -->
	<button
		type="button"
		class="mt-2 rounded-md border border-line px-2.5 py-1 text-xs text-muted transition-colors hover:bg-raised hover:text-content"
		onclick={onretry}
	>
		Try again
	</button>
</div>
