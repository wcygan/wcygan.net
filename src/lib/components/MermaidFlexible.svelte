<script lang="ts">
	import MermaidDiagram from './MermaidDiagram.svelte';

	// This component now just uses MermaidDiagram which supports both props and slots
	export let height = 400;
	export let diagram = '';
	export let useViewport = false;
	export let useLazyLoading = false;
</script>

{#if diagram}
	<!-- Prop-based usage -->
	<MermaidDiagram {height} {diagram} useLazyLoading={useViewport || useLazyLoading} />
{:else}
	<!-- Slot-based usage -->
	<MermaidDiagram {height} useLazyLoading={useViewport || useLazyLoading}>
		<slot />
	</MermaidDiagram>
{/if}
