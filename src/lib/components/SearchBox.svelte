<script lang="ts">
	import type { Post } from '$lib/types';

	export let posts: Post[];
	export let onResults: (results: Post[]) => void;

	let searchTerm = '';

	$: {
		if (searchTerm.length >= 2) {
			const results = posts.filter(
				(post) =>
					post.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
					post.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
					(post.tags &&
						post.tags.some((tag) => tag.toLowerCase().includes(searchTerm.toLowerCase())))
			);
			onResults(results);
		} else {
			onResults(posts);
		}
	}
</script>

<div class="mb-8">
	<input
		type="text"
		placeholder="Search posts..."
		bind:value={searchTerm}
		class="w-full rounded-lg border border-zinc-600 bg-zinc-700 px-4 py-2 text-zinc-100 focus:border-emerald-400 focus:outline-none"
	/>
	{#if searchTerm.length >= 2}
		<p class="mt-2 text-sm text-zinc-400">
			{posts.filter(
				(post) =>
					post.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
					post.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
					(post.tags &&
						post.tags.some((tag) => tag.toLowerCase().includes(searchTerm.toLowerCase())))
			).length} result(s) found
		</p>
	{/if}
</div>
