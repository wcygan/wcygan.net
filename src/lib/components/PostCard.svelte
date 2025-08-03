<script lang="ts">
	import type { Post } from '$lib/types';

	export let post: Post;
</script>

<li class="post-item">
	<div class="post-title">
		<a href="/{post.slug}">{post.title}</a>
	</div>
	<div class="post-date">{post.date}</div>
</li>
