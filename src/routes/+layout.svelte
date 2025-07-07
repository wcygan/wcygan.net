<script lang="ts">
	import '../app.css';
	import Navbar from '$lib/components/Navbar.svelte';
	let { children } = $props();
</script>

<svelte:head>
	<link
		rel="alternate"
		type="application/rss+xml"
		title="Will Cygan | Blog RSS Feed"
		href="/rss.xml"
	/>
</svelte:head>

<div class="min-h-screen">
	<Navbar />
	<main class="mx-auto max-w-3xl px-4 py-4 md:max-w-4xl md:py-8">
		<div class="rounded-lg border-2 border-white p-4 sm:p-6 md:p-8">
			{@render children()}
		</div>
	</main>
</div>
