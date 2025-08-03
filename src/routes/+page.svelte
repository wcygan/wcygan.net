<script lang="ts">
	import type { PageData } from './$types';
	import PostCard from '$lib/components/PostCard.svelte';

	export let data: PageData;
</script>

<div class="bio-highlight">
	<p>
		Software Engineer at <a href="https://www.linkedin.com/in/wcygan">LinkedIn</a> building e-commerce infrastructure.
	</p>
</div>

<section>
	<ul class="post-list">
		{#each data.posts as post}
			<PostCard {post} />
		{/each}
	</ul>
</section>
