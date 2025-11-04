<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		title: string;
		type?: 'concept' | 'insight';
		children: Snippet;
	}

	let { title, type = 'concept', children }: Props = $props();

	// Define styling based on type
	const styles = {
		concept: {
			container: 'bg-emerald-900/20 border border-emerald-400/30',
			title: 'text-emerald-400',
			content: 'text-zinc-100',
			icon: '✨'
		},
		insight: {
			container: 'bg-zinc-700/50 border border-zinc-600',
			title: 'text-zinc-100',
			content: 'text-zinc-300',
			icon: '💡'
		}
	};

	const currentStyle = styles[type];
</script>

<div class="my-6 rounded-lg p-4 {currentStyle.container}">
	<h4 class="mb-2 font-semibold {currentStyle.title}">
		{currentStyle.icon}
		{title}
	</h4>
	<div class={currentStyle.content}>
		{@render children()}
	</div>
</div>
