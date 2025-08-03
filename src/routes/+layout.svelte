<script lang="ts">
	import '../app.css';
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

<div class="min-h-screen bg-white">
	<div class="container">
		<header class="site-header">
			<h1 class="site-title">
				<a href="/">Will Cygan</a>
			</h1>
			<nav class="site-nav">
				<a href="/will_cygan_resume.pdf">Resume</a>
				<a href="mailto:wcygan.io@gmail.com">Email</a>
				<a href="https://github.com/wcygan">GitHub</a>
				<a href="https://www.linkedin.com/in/wcygan">LinkedIn</a>
			</nav>
		</header>

		<main class="main-section">
			{@render children()}
		</main>
	</div>
</div>
