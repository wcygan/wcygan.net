<script lang="ts">
	import { onMount } from 'svelte';

	export let height = 400;
	export let diagram = '';

	let MermaidComponent: typeof import('./MermaidDiagram.svelte').default | null = null;
	let isLoading = true;
	let error: Error | null = null;

	onMount(async () => {
		// onMount only runs in the browser

		try {
			// Dynamically import the MermaidDiagram component only when needed
			const module = await import('./MermaidDiagram.svelte');
			MermaidComponent = module.default;
			isLoading = false;
		} catch (e) {
			console.error('[MermaidLazy] Failed to load MermaidDiagram component:', e);
			error = e instanceof Error ? e : new Error('Unknown error');
			isLoading = false;
		}
	});
</script>

{#if isLoading}
	<div
		class="flex items-center justify-center rounded-lg bg-zinc-900 p-4"
		style="min-height: {height}px"
	>
		<p class="text-zinc-400">Loading diagram component...</p>
	</div>
{:else if error}
	<div
		class="flex items-center justify-center rounded-lg bg-zinc-900 p-4 text-red-400"
		style="min-height: {height}px"
	>
		<p>Failed to load diagram component: {error.message}</p>
	</div>
{:else if MermaidComponent}
	<svelte:component this={MermaidComponent} {height} {diagram} />
{/if}
