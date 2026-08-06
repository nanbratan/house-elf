<script lang="ts">
	import type { SelectableModel } from '@house-elf/shared';

	import { priceLabel, settingList, warnings } from '$lib/utils/model-details';

	interface ModelDetailsProps {
		model: SelectableModel;
		/** Whether the prose details are currently expanded. */
		open: boolean;
	}

	let { model, open }: ModelDetailsProps = $props();

	const modelWarnings = $derived(warnings(model));
	const settings = $derived(settingList(model));
	const inputs = $derived(model.inputModalities.join(', '));
</script>

{#if open}
	<div class="mt-2 space-y-2 border-t border-line pt-2 text-xs text-muted">
		{#if modelWarnings.length > 0}
			<ul class="flex flex-wrap gap-x-3 gap-y-0.5">
				{#each modelWarnings as warning (warning.id)}
					<li class="text-amber-400">
						{warning.label}
					</li>
				{/each}
			</ul>
		{/if}
		<p>{model.description}</p>
		<dl class="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5">
			<dt class="text-faint">Context</dt>
			<dd>{model.contextLength.toLocaleString()} tokens</dd>
			<dt class="text-faint">Price</dt>
			<dd>{priceLabel(model)}</dd>
			{#if model.knowledgeCutoff}
				<dt class="text-faint">Knowledge cutoff</dt>
				<dd>{model.knowledgeCutoff}</dd>
			{/if}
			<dt class="text-faint">Inputs</dt>
			<dd>{inputs}</dd>
			<dt class="text-faint">Settings</dt>
			<dd>{settings.length > 0 ? settings.join(', ') : 'none'}</dd>
		</dl>
	</div>
{/if}
