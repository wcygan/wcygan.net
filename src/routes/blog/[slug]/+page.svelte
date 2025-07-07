<script lang="ts">
	import type { PageData } from './$types';
	import Seo from '$lib/components/Seo.svelte';
	import { formatReadingTime } from '$lib/utils/readingTime';

	export let data: PageData;
	const Content = data.content;

	// Convert date to ISO format for SEO
	const publishedTime = new Date(data.meta.date).toISOString();
</script>

<Seo
	title={data.meta.title}
	description={data.meta.description}
	url="/blog/{data.slug}"
	type="article"
	{publishedTime}
	tags={data.meta.tags || []}
/>

<article class="mdsvex-content prose prose-emerald prose-invert max-w-none">
	<!-- Enhanced metadata header -->
	<header class="mb-6 border-b border-zinc-700 pb-4 sm:mb-8 sm:pb-6">
		<h1 class="mb-3 text-2xl sm:mb-4 sm:text-3xl md:text-4xl">{data.meta.title}</h1>

		<div
			class="mb-3 flex flex-wrap items-center gap-2 text-sm text-zinc-400 sm:mb-4 sm:gap-4 sm:text-base"
		>
			<span>{data.meta.date}</span>
			{#if data.meta.readingTime}
				<span class="hidden sm:inline">•</span>
				<span class="sm:hidden">·</span>
				<span>{formatReadingTime(data.meta.readingTime)}</span>
			{/if}
		</div>

		{#if data.meta.tags && data.meta.tags.length > 0}
			<div class="flex flex-wrap gap-1.5 sm:gap-2">
				{#each data.meta.tags as tag}
					<span
						class="rounded bg-emerald-600/20 px-2 py-0.5 text-xs text-emerald-300 sm:py-1 sm:text-sm"
					>
						{tag}
					</span>
				{/each}
			</div>
		{/if}
	</header>

	<!-- Render the actual markdown content -->
	<Content />
</article>
