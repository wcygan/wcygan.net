<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		title: string;
		children: Snippet;
	}

	let { title, children }: Props = $props();
</script>

<div class="my-6 rounded-lg border border-emerald-400/30 bg-emerald-900/20 p-4">
	<h4 class="mb-2 font-semibold text-emerald-400">✨ {title}</h4>
	<div class="text-zinc-100">
		{@render children()}
	</div>
</div>
