<script lang="ts">
	import { onMount, tick } from 'svelte';
	import MermaidDiagram from './MermaidDiagram.svelte';
	import MermaidViewport from './MermaidViewport.svelte';

	export let height = 400;
	export let diagram: string | undefined = undefined;
	export let lazy = false;
	export let viewport = false;

	// If diagram prop is not provided, use slot content
	let slotContent = '';
	let slotElement: HTMLDivElement;
	let mounted = false;

	// Extract text content from slot after mount
	onMount(async () => {
		// Wait for DOM updates
		await tick();

		if (!diagram && slotElement) {
			// Get the text content, trimming whitespace
			const content = slotElement.textContent?.trim() || '';
			if (content) {
				slotContent = content;
			}
		}

		// Set mounted after content extraction
		mounted = true;
	});

	$: finalDiagram = diagram || slotContent;
</script>

<!-- Hidden div to capture slot content -->
<div bind:this={slotElement} style="display: none">
	<slot />
</div>

{#if diagram || slotContent}
	{#if viewport}
		<MermaidViewport {height} diagram={finalDiagram} />
	{:else if lazy}
		{#await import('./MermaidLazy.svelte') then { default: MermaidLazy }}
			<MermaidLazy {height} diagram={finalDiagram} />
		{/await}
	{:else}
		<MermaidDiagram {height} diagram={finalDiagram} />
	{/if}
{:else if mounted}
	<!-- Show loading or error state -->
	<MermaidDiagram {height} diagram="" />
{/if}
