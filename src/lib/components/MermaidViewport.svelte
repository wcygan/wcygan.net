<script lang="ts">
	import MermaidDiagram from './MermaidDiagram.svelte';

	// This is a simpler wrapper that just enables lazy loading
	export let height = 400;
	export let diagram = '';
	export let rootMargin = '100px';
</script>

<!-- Use MermaidDiagram with lazy loading enabled -->
<MermaidDiagram {height} {diagram} useLazyLoading={true} {rootMargin} />
