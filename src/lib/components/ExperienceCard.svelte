<script lang="ts">
	import type { Experience } from '$lib/types.js';

	interface Props {
		experience: Experience;
	}

	let { experience }: Props = $props();

	// Detect current role (contains "Present" in period)
	const isCurrent = $derived(experience.period.toLowerCase().includes('present'));
</script>

<li
	class="card-base card-hover list-none border border-zinc-700 hover:border-emerald-400"
	role="listitem"
>
	<header class="mb-3 flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
		<div class="flex items-center gap-2">
			<span class="text-base font-semibold tracking-wide text-zinc-100 sm:text-lg">
				{experience.company}
			</span>
			{#if isCurrent}
				<span
					class="rounded-full bg-yellow-500/20 px-2 py-0.5 text-xs font-medium text-yellow-300 ring-1 ring-yellow-500/30"
				>
					Current
				</span>
			{/if}
		</div>
		<time class="text-xs text-zinc-400 sm:text-sm" datetime={experience.period}>
			{experience.period}
		</time>
	</header>

	<h3 class="mb-2 text-base font-medium text-emerald-400">
		{experience.title}
	</h3>

	{#if experience.location}
		<p class="mb-2 text-sm text-zinc-400">
			{experience.location}
		</p>
	{/if}

	<p class="mb-4 text-sm leading-relaxed text-zinc-300">
		{experience.summary}
	</p>

	{#if experience.achievements && experience.achievements.length > 0}
		<div class="mb-4">
			<h4 class="mb-2 text-sm font-medium text-zinc-100">Key Achievements:</h4>
			<ul class="list-inside list-disc space-y-1">
				{#each experience.achievements as achievement}
					<li class="text-sm text-zinc-300">{achievement}</li>
				{/each}
			</ul>
		</div>
	{/if}

	{#if experience.technologies && experience.technologies.length > 0}
		<div class="flex flex-wrap gap-1.5 sm:gap-2.5">
			{#each experience.technologies as tech}
				<span
					class="rounded-full bg-emerald-600/20 px-2 py-1 text-xs font-medium text-emerald-300 transition-all duration-200 hover:scale-105 hover:bg-emerald-600/30 hover:shadow-sm sm:px-3 sm:py-1.5 sm:text-sm"
				>
					{tech}
				</span>
			{/each}
		</div>
	{/if}
</li>
