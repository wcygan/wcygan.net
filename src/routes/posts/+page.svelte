<script lang="ts">
	import type { PageData } from './$types';

	export let data: PageData;
</script>

<div class="mx-auto max-w-2xl">
	<h1 class="mb-6 text-4xl font-bold">Blog Posts</h1>
	<div class="space-y-6">
		{#each data.posts as post}
			<article class="post-card">
				<h2 class="mb-2 text-2xl font-bold text-emerald-400">
					<a href="/blog/{post.slug}" class="text-emerald-400 hover:text-emerald-300">
						{post.title}
					</a>
				</h2>
				<div class="mb-2 text-zinc-400">{post.date}</div>
				<p class="mb-4 text-zinc-300">{post.description}</p>
			</article>
		{/each}
	</div>
</div>
