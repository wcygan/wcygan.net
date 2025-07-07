<script lang="ts">
	import type { Post } from '$lib/types';
	import { formatReadingTime } from '$lib/utils/readingTime';

	export let post: Post;
</script>

<a
	href="/blog/{post.slug}"
	class="not-prose block rounded-lg border border-zinc-700 bg-zinc-700 p-4 text-zinc-100 no-underline transition-all duration-200 hover:-translate-y-1 hover:border-emerald-400 hover:text-emerald-300 hover:shadow-lg sm:p-6"
	aria-labelledby="post-{post.slug}-title"
>
	<article>
		<h2 id="post-{post.slug}-title" class="mb-2 text-xl font-bold sm:mb-3 sm:text-2xl">
			{post.title}
		</h2>

		<div
			class="mb-2 flex flex-wrap items-center gap-2 text-sm text-zinc-400 sm:mb-3 sm:gap-4 sm:text-base"
		>
			<span>{post.date}</span>
			{#if post.readingTime && post.readingTime > 0}
				<span class="hidden sm:inline">•</span>
				<span class="sm:hidden">·</span>
				<span>{formatReadingTime(post.readingTime)}</span>
			{/if}
		</div>

		<p class="mb-3 text-sm leading-relaxed text-zinc-300 sm:mb-4 sm:text-base">
			{post.description}
		</p>

		{#if post.tags && post.tags.length > 0}
			<div class="flex flex-wrap gap-1.5 sm:gap-2">
				{#each post.tags as tag}
					<span
						class="rounded bg-emerald-600/20 px-2 py-0.5 text-xs text-emerald-300 sm:py-1 sm:text-sm"
					>
						{tag}
					</span>
				{/each}
			</div>
		{/if}
	</article>
</a>
