<script lang="ts">
	export let title = 'Will Cygan | Blog';
	export let description =
		'Software Engineer interested in distributed systems, web applications, and system design.';
	export let url = 'https://wcygan.github.io/';
	export let image = '/wcygan.jpeg';
	export let type: 'website' | 'article' = 'website';
	export let publishedTime: string | null = null;
	export let author = 'Will Cygan';
	export let tags: string[] = [];

	// Create absolute URLs for images and URLs
	const absoluteUrl = url.startsWith('http') ? url : `https://wcygan.github.io${url}`;
	const absoluteImage = image.startsWith('http') ? image : `https://wcygan.github.io${image}`;
</script>

<svelte:head>
	<title>{title}</title>
	<meta name="description" content={description} />
	<link rel="canonical" href={absoluteUrl} />

	<!-- Open Graph -->
	<meta property="og:title" content={title} />
	<meta property="og:description" content={description} />
	<meta property="og:type" content={type} />
	<meta property="og:url" content={absoluteUrl} />
	<meta property="og:image" content={absoluteImage} />
	<meta property="og:site_name" content="Will Cygan | Blog" />
	{#if publishedTime}
		<meta property="article:published_time" content={publishedTime} />
		<meta property="article:author" content={author} />
	{/if}
	{#if tags.length > 0}
		{#each tags as tag}
			<meta property="article:tag" content={tag} />
		{/each}
	{/if}

	<!-- Twitter Card -->
	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:title" content={title} />
	<meta name="twitter:description" content={description} />
	<meta name="twitter:url" content={absoluteUrl} />
	<meta name="twitter:image" content={absoluteImage} />

	<!-- Additional SEO Meta Tags -->
	<meta name="author" content={author} />
	{#if tags.length > 0}
		<meta name="keywords" content={tags.join(', ')} />
	{/if}
</svelte:head>
