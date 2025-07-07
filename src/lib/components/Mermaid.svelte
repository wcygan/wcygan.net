<script lang="ts">
	import { onMount } from 'svelte';
	import { fade } from 'svelte/transition';
	import mermaid from 'mermaid';
	import Loading from './Loading.svelte';

	export let height = 400;

	let container: HTMLDivElement;
	let diagramElement: HTMLDivElement;
	let rendered = false;
	let error = false;
	let errorMessage = '';

	onMount(() => {
		// Initialize mermaid with dark theme
		mermaid.initialize({
			theme: 'dark',
			startOnLoad: false,
			darkMode: true,
			themeVariables: {
				primaryColor: '#34d399',
				primaryTextColor: '#e4e4e7',
				primaryBorderColor: '#34d399',
				lineColor: '#71717a',
				secondaryColor: '#27272a',
				tertiaryColor: '#18181b',
				background: '#09090b',
				mainBkg: '#18181b',
				secondBkg: '#27272a',
				tertiaryBkg: '#09090b',
				secondaryBorderColor: '#52525b',
				tertiaryBorderColor: '#3f3f46',
				fontFamily: 'Inter, system-ui, sans-serif',
				fontSize: '16px'
			}
		});

		// Render diagram after a short delay to ensure content is loaded
		setTimeout(() => renderDiagram(), 100);
	});

	async function renderDiagram() {
		try {
			if (!diagramElement) {
				console.error('Diagram element not found');
				return;
			}

			// Get the text content from the element
			const content = diagramElement.textContent?.trim() || '';
			console.log('Mermaid content to render:', content);

			if (!content) {
				throw new Error('No diagram content found');
			}

			// Clear the element and add the content back
			diagramElement.textContent = content;

			// Run mermaid on the specific element
			await mermaid.run({
				nodes: [diagramElement]
			});

			rendered = true;
			console.log('Mermaid diagram rendered successfully');
		} catch (e) {
			console.error('Mermaid rendering error:', e);
			error = true;
			errorMessage = e instanceof Error ? e.message : 'Unknown error';
			rendered = true;
		}
	}
</script>

<div
	bind:this={container}
	class="mermaid-container relative overflow-x-auto rounded-lg bg-zinc-900 p-4"
	style="min-height: {height}px"
>
	{#if !rendered}
		<div class="absolute inset-0 flex items-center justify-center">
			<Loading />
		</div>
	{/if}

	{#if error}
		<div
			transition:fade={{ duration: 200 }}
			class="flex flex-col items-center justify-center text-red-400"
			style="height: {height}px"
		>
			<p class="font-bold">Error rendering diagram</p>
			<p class="mt-2 text-sm">{errorMessage}</p>
		</div>
	{:else}
		<div
			bind:this={diagramElement}
			class="mermaid"
			class:opacity-0={!rendered}
			transition:fade={{ duration: 200 }}
		>
			<slot />
		</div>
	{/if}
</div>

<style>
	.mermaid-container {
		margin: 1.5rem 0;
	}

	.opacity-0 {
		opacity: 0;
	}
</style>
