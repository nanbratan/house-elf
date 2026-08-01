<script lang="ts">
	// Six dots chasing clockwise round a 2×3 cell. Motion that travels reads as
	// work in progress at a glance, where a single pulsing dot looks the same
	// whether a call started a second ago or has hung.
	//
	// The grid fills row by row, so these delays are in reading order but describe
	// a loop: top-left, top-right, down the right column, back up the left.
	const chase = [0, 100, 500, 200, 400, 300];
</script>

<span class="grid shrink-0 grid-cols-2 grid-rows-3 gap-[2px]" aria-hidden="true">
	{#each chase as delay (delay)}
		<span class="dot size-[3px] rounded-full bg-accent" style="animation-delay: {delay}ms"></span>
	{/each}
</span>

<style>
	.dot {
		animation: chase 900ms ease-in-out infinite;
	}

	@keyframes chase {
		0%,
		60%,
		100% {
			opacity: 0.2;
		}
		30% {
			opacity: 1;
		}
	}

	/* Anyone who has asked for less movement gets a steady cluster instead. */
	@media (prefers-reduced-motion: reduce) {
		.dot {
			animation: none;
			opacity: 0.6;
		}
	}
</style>
