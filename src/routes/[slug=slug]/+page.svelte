<script lang="ts">
	import type { PageData } from './$types';

	export let data: PageData;
</script>

<svelte:head>
	<title>{data.meta.title} - Will Cygan</title>
	<meta name="description" content={data.meta.description} />
</svelte:head>

<article class="blog-post">
	<header class="post-header">
		<h1 class="post-title">{data.meta.title}</h1>
		<div class="post-meta">
			<time datetime={data.meta.date}>{data.meta.date}</time>
		</div>
	</header>

	<div class="post-content">
		<svelte:component this={data.content} />
	</div>
</article>
