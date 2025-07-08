<script lang="ts">
	import MermaidDiagram from './MermaidDiagram.svelte';

	// This is a compatibility wrapper for the deprecated Mermaid component
	// All functionality has been merged into MermaidDiagram
	export let height = 400;
</script>

<!-- Use MermaidDiagram with slot content -->
<MermaidDiagram {height}>
	<slot />
</MermaidDiagram>
