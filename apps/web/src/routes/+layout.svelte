<script lang="ts">
	import type { Snippet } from 'svelte';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';

	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';

	let { children }: { children: Snippet } = $props();

	let sidebarOpen = $state(true);

	// Static placeholders until M2 wires the sidebar to real threads.
	const conversations = [
		{ id: '1', title: 'Placeholder conversation' },
		{ id: '2', title: 'Another placeholder' }
	];
</script>

<svelte:head><link rel="icon" href={favicon} /></svelte:head>

<div class="flex h-screen overflow-hidden">
	<aside
		class="flex shrink-0 flex-col overflow-hidden border-line bg-surface transition-[width] duration-200"
		class:w-64={sidebarOpen}
		class:border-r={sidebarOpen}
		class:w-0={!sidebarOpen}
	>
		<div class="flex h-12 shrink-0 items-center px-4">
			<span class="text-sm font-semibold whitespace-nowrap">house-elf</span>
		</div>

		<nav class="flex-1 overflow-y-auto px-2 py-2">
			<ul class="space-y-1">
				{#each conversations as conversation (conversation.id)}
					{@const active = page.url.pathname === `/c/${conversation.id}`}
					<li>
						<a
							href={resolve('/c/[id]', { id: conversation.id })}
							class="block truncate rounded-md px-3 py-2 text-sm whitespace-nowrap transition-colors hover:bg-raised"
							class:bg-accent-soft={active}
							class:text-accent={active}
							class:text-muted={!active}
						>
							{conversation.title}
						</a>
					</li>
				{/each}
			</ul>
		</nav>
	</aside>

	<div class="flex min-w-0 flex-1 flex-col">
		<header class="flex h-12 shrink-0 items-center gap-3 border-b border-line px-3">
			<button
				type="button"
				onclick={() => (sidebarOpen = !sidebarOpen)}
				aria-label={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
				aria-expanded={sidebarOpen}
				class="rounded-md p-2 text-muted transition-colors hover:bg-raised hover:text-content"
			>
				<svg
					class="size-4"
					viewBox="0 0 16 16"
					fill="none"
					stroke="currentColor"
					stroke-width="1.5"
					aria-hidden="true"
				>
					<rect x="1.5" y="2.5" width="13" height="11" rx="2" />
					<line x1="6" y1="2.5" x2="6" y2="13.5" />
				</svg>
			</button>
		</header>

		<main class="min-h-0 flex-1 overflow-y-auto">
			{@render children()}
		</main>
	</div>
</div>
