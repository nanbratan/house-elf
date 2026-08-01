<script lang="ts">
	// Stands in for the whole part renderer so `ChatView` can be tested on message
	// framing alone: whose message it is, and which parts it passes down.
	//
	// The part is printed rather than serialised, because what `ChatView` owes its
	// children is a part of the right kind, in the right order — not a particular
	// object graph. `MessagePart`'s own tests cover the props in full.
	let { part }: { part: { type: string; text?: string } } = $props();
</script>

<div data-testid="part">{part.type}{part.text === undefined ? '' : `: ${part.text}`}</div>
