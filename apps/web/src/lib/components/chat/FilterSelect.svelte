<script lang="ts">
	import { Select } from 'bits-ui';

	export interface FilterOption {
		readonly value: string;
		readonly label: string;
		/** Shown greyed beside the label — a count, a caveat, anything secondary. */
		readonly hint?: string;
	}

	interface FilterSelectProps {
		label: string;
		options: readonly FilterOption[];
		value: string[];
		onValueChange: (value: string[]) => void;
	}

	let { label, options, value, onValueChange }: FilterSelectProps = $props();
</script>

<Select.Root type="multiple" {value} {onValueChange}>
	<Select.Trigger
		aria-label={label}
		class="flex items-center gap-1.5 rounded-full border border-line px-2.5 py-1 text-xs text-muted transition-colors hover:text-content data-[state=open]:border-accent"
	>
		<span>{label}</span>
		{#if value.length > 0}
			<span class="rounded-full bg-accent px-1.5 text-[0.625rem] text-white">{value.length}</span>
		{/if}
		<svg
			class="size-3 text-faint"
			viewBox="0 0 12 12"
			fill="none"
			stroke="currentColor"
			stroke-width="1.5"
			aria-hidden="true"
		>
			<path d="m3 4.5 3 3 3-3" />
		</svg>
	</Select.Trigger>

	<Select.Portal>
		<Select.Content
			sideOffset={6}
			align="start"
			class="z-50 max-h-56 w-48 overflow-y-auto rounded-lg border border-line bg-surface p-1 shadow-xl"
		>
			<Select.Viewport>
				{#each options as option (option.value)}
					<Select.Item
						value={option.value}
						label={option.label}
						class="flex cursor-default items-center gap-2 rounded-md px-2 py-1.5 text-sm outline-none data-highlighted:bg-raised"
					>
						{#snippet children({ selected })}
							<span class="flex-1 truncate">{option.label}</span>
							{#if option.hint}
								<span class="text-xs text-faint">{option.hint}</span>
							{/if}
							{#if selected}
								<svg
									class="size-3.5 shrink-0 text-accent"
									viewBox="0 0 16 16"
									fill="none"
									stroke="currentColor"
									stroke-width="1.75"
									aria-hidden="true"
								>
									<path d="m3 8 3 3 7-7" />
								</svg>
							{/if}
						{/snippet}
					</Select.Item>
				{/each}
			</Select.Viewport>
		</Select.Content>
	</Select.Portal>
</Select.Root>
