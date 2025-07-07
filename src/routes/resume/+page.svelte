<script lang="ts">
	import Seo from '$lib/components/Seo.svelte';
</script>

<Seo
	title="Resume - Will Cygan"
	description="Software Engineer specializing in distributed systems and e-commerce platforms"
/>

<div class="mx-auto max-w-3xl">
	<div class="mb-8 flex items-center justify-between">
		<h1 class="text-4xl font-bold">Resume</h1>
		<!-- Uncomment when you have a PDF resume -->
		<!-- <a href="/will_cygan_resume.pdf" 
           class="bg-emerald-600 hover:bg-emerald-700 px-4 py-2 rounded-lg transition-colors inline-flex items-center gap-2"
           target="_blank">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Download PDF
        </a> -->
	</div>

	<div class="prose prose-emerald prose-invert max-w-none">
		<section class="mb-8">
			<h2>Experience</h2>

			<div class="mb-6 rounded-lg border border-zinc-700 bg-zinc-800 p-6">
				<div class="mb-3 flex items-start justify-between">
					<div>
						<h3 class="mb-1 text-xl font-bold">Software Engineer</h3>
						<p class="font-medium text-emerald-400">LinkedIn</p>
					</div>
					<span class="text-zinc-400">Present</span>
				</div>
				<p class="mb-3 text-zinc-400">LinkedIn Business Platform (E-Commerce)</p>
				<ul class="text-zinc-300">
					<li>Working on scalable e-commerce solutions and business platform infrastructure</li>
					<li>Developing distributed systems for high-traffic applications</li>
					<li>Contributing to system design and architecture decisions</li>
				</ul>
			</div>
		</section>

		<section class="mb-8">
			<h2>Technical Skills</h2>

			<div class="grid gap-6 md:grid-cols-2">
				<div class="rounded-lg border border-zinc-700 bg-zinc-800 p-6">
					<h3 class="mb-3 text-lg font-bold text-emerald-400">Languages & Frameworks</h3>
					<div class="flex flex-wrap gap-2">
						<span class="rounded bg-zinc-700 px-3 py-1 text-sm">Java</span>
						<span class="rounded bg-zinc-700 px-3 py-1 text-sm">Python</span>
						<span class="rounded bg-zinc-700 px-3 py-1 text-sm">JavaScript</span>
						<span class="rounded bg-zinc-700 px-3 py-1 text-sm">TypeScript</span>
						<span class="rounded bg-zinc-700 px-3 py-1 text-sm">Rust</span>
						<span class="rounded bg-zinc-700 px-3 py-1 text-sm">Go</span>
					</div>
				</div>

				<div class="rounded-lg border border-zinc-700 bg-zinc-800 p-6">
					<h3 class="mb-3 text-lg font-bold text-emerald-400">Systems & Tools</h3>
					<div class="flex flex-wrap gap-2">
						<span class="rounded bg-zinc-700 px-3 py-1 text-sm">Distributed Systems</span>
						<span class="rounded bg-zinc-700 px-3 py-1 text-sm">Microservices</span>
						<span class="rounded bg-zinc-700 px-3 py-1 text-sm">Docker</span>
						<span class="rounded bg-zinc-700 px-3 py-1 text-sm">Kubernetes</span>
						<span class="rounded bg-zinc-700 px-3 py-1 text-sm">AWS</span>
						<span class="rounded bg-zinc-700 px-3 py-1 text-sm">System Design</span>
					</div>
				</div>
			</div>
		</section>

		<section class="mb-8">
			<h2>Interests</h2>
			<ul>
				<li>Distributed Systems Architecture</li>
				<li>System Design & Performance Optimization</li>
				<li>E-Commerce Platform Development</li>
				<li>Modern Web Development</li>
				<li>Open Source Contributions</li>
			</ul>
		</section>

		<section>
			<h2>Connect</h2>
			<p>
				Interested in discussing opportunities or collaboration? Feel free to reach out via
				<a
					href="https://linkedin.com/in/wcygan"
					target="_blank"
					rel="noopener noreferrer"
					class="text-emerald-400 hover:text-emerald-300">LinkedIn</a
				>
				or check out my projects on
				<a
					href="https://github.com/wcygan"
					target="_blank"
					rel="noopener noreferrer"
					class="text-emerald-400 hover:text-emerald-300">GitHub</a
				>.
			</p>
		</section>
	</div>
</div>
