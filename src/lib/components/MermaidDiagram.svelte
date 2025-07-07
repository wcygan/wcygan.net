<script lang="ts">
	import { onMount, tick } from 'svelte';
	import { fade } from 'svelte/transition';
	import Loading from './Loading.svelte';
	import MermaidFullscreen from './MermaidFullscreen.svelte';
	import { getCachedSVG, setCachedSVG } from '$lib/utils/mermaid-cache';

	export let height = 400;
	export let diagram = '';

	let container: HTMLDivElement;
	let rendered = false;
	let error = false;
	let errorMessage = '';
	let status = 'initializing';
	let isMounted = false;
	let isScrollable = false;
	let containerWidth = 0;
	let showFullscreen = false;
	let currentSvgContent = '';

	async function loadMermaid() {
		try {
			// Use the standard import which Vite will handle with the alias
			console.log('[MermaidDiagram] Loading Mermaid module...');
			const mod = await import('mermaid');
			const mermaid = mod.default || mod;
			console.log('[MermaidDiagram] Mermaid loaded successfully');
			return mermaid;
		} catch (e) {
			console.error('[MermaidDiagram] Failed to load Mermaid:', e);
			throw new Error(
				`Failed to load Mermaid module: ${e instanceof Error ? e.message : String(e)}`
			);
		}
	}

	async function renderDiagram() {
		try {
			// Wait for container to be available
			if (!container) {
				await tick();
				// Give DOM more time to mount the container
				await new Promise((resolve) => setTimeout(resolve, 100));
			}

			// Check cache first
			const cachedSVG = getCachedSVG(diagram);
			if (cachedSVG && container) {
				console.log('[MermaidDiagram] Using cached SVG');
				container.innerHTML = cachedSVG;

				// Add accessibility attributes and optimize cached SVG as well
				const svgElement = container.querySelector('svg');
				if (svgElement) {
					svgElement.setAttribute('role', 'img');
					svgElement.setAttribute(
						'aria-label',
						`Mermaid diagram: ${diagram.split('\n')[0].trim()}`
					);

					// Optimize SVG viewBox for better mobile scaling (cached version)
					const bbox = svgElement.getBBox();
					if (bbox.width > 0 && bbox.height > 0) {
						// Add padding around the content
						const padding = 10;
						svgElement.setAttribute(
							'viewBox',
							`${bbox.x - padding} ${bbox.y - padding} ${bbox.width + 2 * padding} ${bbox.height + 2 * padding}`
						);
						svgElement.setAttribute('preserveAspectRatio', 'xMidYMid meet');
					}

					// Check if diagram needs horizontal scrolling
					checkScrollability();
				}

				// Store SVG content for fullscreen
				currentSvgContent = cachedSVG;
				rendered = true;
				status = 'complete';
				return;
			}

			// Import Mermaid
			status = 'loading module';
			const mermaid = await loadMermaid();

			if (!mermaid || typeof mermaid.initialize !== 'function') {
				throw new Error('Mermaid loaded but missing expected methods');
			}

			console.log(
				'[MermaidDiagram] Mermaid version:',
				(mermaid as { version?: string }).version || 'unknown'
			);

			// Initialize
			status = 'initializing';
			// Check if we're on mobile
			const isMobile = window.innerWidth <= 768;

			mermaid.initialize({
				startOnLoad: false,
				theme: 'dark',
				securityLevel: 'loose',
				logLevel: 'debug',
				flowchart: {
					useMaxWidth: true,
					htmlLabels: true,
					curve: 'basis'
				},
				gitGraph: {
					useMaxWidth: true
				},
				sequence: {
					useMaxWidth: true,
					wrap: isMobile // Enable text wrapping on mobile
				}
			});

			// Ensure container exists
			await tick();
			if (!container) {
				// Wait a bit more if container isn't ready
				await new Promise((resolve) => setTimeout(resolve, 50));
				await tick();
			}

			if (!container) {
				throw new Error('Container element not available');
			}

			// Generate unique ID
			const id = `mermaid-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

			// Clean the diagram text
			const cleanDiagram = diagram.trim();

			console.log('[MermaidDiagram] Rendering with ID:', id);
			status = 'rendering';

			// Render the diagram
			const renderResult = await mermaid.render(id, cleanDiagram);

			if (!renderResult || !renderResult.svg) {
				throw new Error('No SVG returned from render');
			}

			console.log('[MermaidDiagram] SVG generated, length:', renderResult.svg.length);

			// Cache the rendered SVG
			setCachedSVG(diagram, renderResult.svg);

			// Insert SVG
			container.innerHTML = renderResult.svg;

			// Store SVG content for fullscreen
			currentSvgContent = renderResult.svg;

			// Add accessibility attributes and optimize SVG for mobile
			const svgElement = container.querySelector('svg');
			if (svgElement) {
				svgElement.setAttribute('role', 'img');
				svgElement.setAttribute('aria-label', `Mermaid diagram: ${diagram.split('\n')[0].trim()}`);

				// Optimize SVG viewBox for better mobile scaling
				const bbox = svgElement.getBBox();
				if (bbox.width > 0 && bbox.height > 0) {
					// Add padding around the content
					const padding = 10;
					svgElement.setAttribute(
						'viewBox',
						`${bbox.x - padding} ${bbox.y - padding} ${bbox.width + 2 * padding} ${bbox.height + 2 * padding}`
					);
					svgElement.setAttribute('preserveAspectRatio', 'xMidYMid meet');
				}

				// Check if diagram needs horizontal scrolling
				checkScrollability();
			}

			rendered = true;
			status = 'complete';

			console.log('[MermaidDiagram] Render complete!');

			// Clean up any orphaned elements
			setTimeout(() => {
				const orphans = document.querySelectorAll(`[id^="d${id}"]`);
				orphans.forEach((el) => {
					if (!container.contains(el)) {
						el.remove();
					}
				});
			}, 100);
		} catch (e) {
			console.error('[MermaidDiagram] Error:', e);
			error = true;
			errorMessage = e instanceof Error ? e.message : String(e);
			status = 'error';
			rendered = true;
		}
	}

	function checkScrollability() {
		if (!container) return;

		const svg = container.querySelector('svg');
		if (!svg) return;

		// Get the actual rendered width of the SVG
		const svgWidth = svg.getBoundingClientRect().width;
		containerWidth = container.getBoundingClientRect().width;

		// Check if content is wider than container
		isScrollable = svgWidth > containerWidth + 10; // 10px tolerance
	}

	function openFullscreen() {
		showFullscreen = true;
	}

	function closeFullscreen() {
		showFullscreen = false;
	}

	onMount(() => {
		// onMount only runs in the browser, so we don't need to check $app/environment
		isMounted = true;

		if (!diagram || diagram.trim() === '') {
			error = true;
			errorMessage = 'No diagram content provided';
			rendered = true;
			return;
		}

		console.log('[MermaidDiagram] Component mounted');
		console.log('[MermaidDiagram] Diagram preview:', diagram.substring(0, 50) + '...');

		status = 'starting';

		// Add a small delay to ensure DOM is fully ready
		const timeoutId = setTimeout(async () => {
			// Double-check container is available
			await tick();
			renderDiagram();
		}, 100);

		// Handle resize events for responsive behavior
		function handleResize() {
			checkScrollability();
		}

		window.addEventListener('resize', handleResize);

		// Cleanup on unmount
		return () => {
			clearTimeout(timeoutId);
			window.removeEventListener('resize', handleResize);
		};
	});
</script>

<div
	class="mermaid-container relative overflow-x-auto rounded-lg bg-zinc-900 p-4"
	data-scrollable={isScrollable}
	style="min-height: {height}px"
>
	{#if !rendered && isMounted}
		<div class="absolute inset-0 flex items-center justify-center">
			<div class="text-center">
				<Loading />
				<p class="mt-2 text-sm text-zinc-400">Status: {status}</p>
			</div>
		</div>
	{/if}

	{#if error}
		<div
			transition:fade={{ duration: 200 }}
			class="flex flex-col items-center justify-center text-red-400"
			style="height: {height}px"
		>
			<p class="font-bold">Error rendering diagram</p>
			<p class="mt-2 text-sm">{errorMessage}</p>
			<details class="mt-4 w-full max-w-2xl">
				<summary class="cursor-pointer">Diagram Source</summary>
				<pre class="mt-2 overflow-x-auto rounded bg-zinc-800 p-2 text-xs">{diagram}</pre>
			</details>
			<details class="mt-2 w-full max-w-2xl">
				<summary class="cursor-pointer">Debug Info</summary>
				<div class="mt-2 rounded bg-zinc-800 p-2 text-xs">
					<p>Status: {status}</p>
					<p>Component mounted: {isMounted}</p>
					<p>Diagram length: {diagram.length}</p>
				</div>
			</details>
		</div>
	{/if}

	<!-- Container for rendered diagram -->
	<div
		bind:this={container}
		class="mermaid-render-container"
		class:hidden={!rendered || error}
		transition:fade={{ duration: 300 }}
	></div>

	<!-- Fullscreen button for mobile -->
	{#if rendered && !error && typeof window !== 'undefined' && window.innerWidth <= 768}
		<button
			class="fullscreen-button"
			on:click={openFullscreen}
			aria-label="View diagram in fullscreen"
			transition:fade={{ duration: 200 }}
		>
			<svg
				width="20"
				height="20"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
			>
				<path
					d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"
				></path>
			</svg>
		</button>
	{/if}

	{#if !isMounted}
		<div class="flex items-center justify-center" style="height: {height}px">
			<p class="text-zinc-400">Loading diagram...</p>
		</div>
	{/if}
</div>

<!-- Fullscreen modal -->
<MermaidFullscreen
	svgContent={currentSvgContent}
	isOpen={showFullscreen}
	onClose={closeFullscreen}
/>

<style>
	.mermaid-container {
		margin: 1.5rem 0;
	}

	.hidden {
		display: none;
	}

	:global(.mermaid-render-container svg) {
		max-width: 100%;
		height: auto;
		display: block;
		margin: 0 auto;
	}

	/* Styles moved to app.css for consistency */
	/* Error styles */
	details {
		cursor: pointer;
	}

	details summary:hover {
		text-decoration: underline;
	}

	/* Fullscreen button styling */
	.fullscreen-button {
		position: absolute;
		top: 0.5rem;
		right: 0.5rem;
		background: rgba(63, 63, 70, 0.9); /* zinc-700 with opacity */
		color: rgb(228, 228, 231); /* zinc-100 */
		border: 1px solid rgb(82, 82, 91); /* zinc-600 */
		border-radius: 0.375rem;
		padding: 0.375rem;
		cursor: pointer;
		transition: all 0.2s ease;
		opacity: 0.7;
		z-index: 10;
	}

	.fullscreen-button:hover {
		opacity: 1;
		background: rgb(82, 82, 91); /* zinc-600 */
		border-color: rgb(52, 211, 153); /* emerald-400 */
		transform: scale(1.05);
	}

	.fullscreen-button:active {
		transform: scale(0.95);
	}

	@media (max-width: 480px) {
		.fullscreen-button {
			padding: 0.25rem;
			top: 0.25rem;
			right: 0.25rem;
		}
	}
</style>
