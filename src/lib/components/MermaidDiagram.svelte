<script lang="ts">
	import { onMount, tick } from 'svelte';
	import { fade } from 'svelte/transition';
	import Loading from './Loading.svelte';
	import MermaidFullscreen from './MermaidFullscreen.svelte';
	import { getCachedSVG, setCachedSVG } from '$lib/utils/mermaid-cache';

	// Props
	export let height = 400;
	export let diagram = '';
	export let useLazyLoading = false;
	export let rootMargin = '100px'; // For lazy loading

	// Internal state
	let container: HTMLDivElement;
	let slotContainer: HTMLDivElement;
	let rendered = false;
	let error = false;
	let errorMessage = '';
	let status = 'initializing';
	let isMounted = false;
	let isScrollable = false;
	let containerWidth = 0;
	let showFullscreen = false;
	let currentSvgContent = '';
	let diagramContent = '';
	let isInViewport = !useLazyLoading; // If not lazy loading, render immediately

	// Mermaid instance (cached at module level for performance)
	let mermaidInstance: any = null;

	// Check if we have slot content
	$: hasSlotContent = $$slots.default;
	$: effectiveDiagram = diagramContent || diagram;

	// Comprehensive theme configuration for all Mermaid diagram types
	const MERMAID_THEME = {
		theme: 'dark',
		themeVariables: {
			// Base colors
			background: '#18181b', // zinc-900
			primaryColor: '#3f3f46', // zinc-700
			primaryBorderColor: '#34d399', // emerald-400
			primaryTextColor: '#e4e4e7', // zinc-100
			secondaryColor: '#27272a', // zinc-800
			tertiaryColor: '#18181b', // zinc-900

			// Node styling (flowcharts, general)
			nodeBkg: '#3f3f46', // zinc-700
			nodeBorder: '#34d399', // emerald-400
			nodeTextColor: '#e4e4e7', // zinc-100

			// Line colors
			lineColor: '#71717a', // zinc-500
			textColor: '#e4e4e7', // zinc-100

			// Special elements
			mainBkg: '#3f3f46', // zinc-700
			secondBkg: '#27272a', // zinc-800

			// Sequence diagram specific
			actorBkg: '#3f3f46', // zinc-700
			actorBorder: '#34d399', // emerald-400
			actorTextColor: '#e4e4e7', // zinc-100
			actorLineColor: '#71717a', // zinc-500
			signalColor: '#71717a', // zinc-500
			signalTextColor: '#e4e4e7', // zinc-100
			labelBoxBkgColor: '#27272a', // zinc-800
			labelBoxBorderColor: '#34d399', // emerald-400
			labelTextColor: '#e4e4e7', // zinc-100
			loopTextColor: '#e4e4e7', // zinc-100
			noteBorderColor: '#34d399', // emerald-400
			noteBkgColor: '#27272a', // zinc-800
			noteTextColor: '#e4e4e7', // zinc-100
			activationBorderColor: '#34d399', // emerald-400
			activationBkgColor: '#3f3f46', // zinc-700
			sequenceNumberColor: '#e4e4e7', // zinc-100

			// State diagram specific
			specialStateColor: '#34d399', // emerald-400
			innerEndBackground: '#3f3f46', // zinc-700
			compositeBackground: '#27272a', // zinc-800
			compositeTitleBackground: '#18181b', // zinc-900

			// Class diagram specific
			classText: '#e4e4e7', // zinc-100

			// Git graph specific
			git0: '#34d399', // emerald-400
			git1: '#10b981', // emerald-500
			git2: '#059669', // emerald-600
			git3: '#047857', // emerald-700
			git4: '#065f46', // emerald-800
			git5: '#064e3b', // emerald-900
			git6: '#022c22', // emerald-950
			git7: '#34d399', // emerald-400

			// Pie chart specific
			pie1: '#34d399', // emerald-400
			pie2: '#10b981', // emerald-500
			pie3: '#059669', // emerald-600
			pie4: '#047857', // emerald-700
			pie5: '#065f46', // emerald-800
			pie6: '#064e3b', // emerald-900
			pie7: '#022c22', // emerald-950
			pie8: '#6b7280', // gray-500
			pie9: '#4b5563', // gray-600
			pie10: '#374151', // gray-700
			pie11: '#1f2937', // gray-800
			pie12: '#111827', // gray-900

			// Gantt chart specific
			section0: '#3f3f46', // zinc-700
			section1: '#27272a', // zinc-800
			section2: '#18181b', // zinc-900
			section3: '#09090b', // zinc-950

			// General styling
			clusterBkg: '#27272a', // zinc-800
			clusterBorder: '#52525b', // zinc-600
			defaultLinkColor: '#71717a', // zinc-500
			titleColor: '#34d399', // emerald-400
			edgeLabelBackground: '#18181b', // zinc-900

			// Error colors
			errorBkgColor: '#7f1d1d', // red-900
			errorTextColor: '#fecaca', // red-200

			// Font settings
			fontFamily: 'Inter, system-ui, sans-serif',
			fontSize: '14px'
		}
	};

	async function loadMermaid() {
		if (mermaidInstance) return mermaidInstance;

		try {
			console.log('[MermaidDiagram] Loading Mermaid module...');
			const mod = await import('mermaid');
			mermaidInstance = mod.default || mod;
			console.log('[MermaidDiagram] Mermaid loaded successfully');
			return mermaidInstance;
		} catch (e) {
			console.error('[MermaidDiagram] Failed to load Mermaid:', e);
			throw new Error(
				`Failed to load Mermaid module: ${e instanceof Error ? e.message : String(e)}`
			);
		}
	}

	async function extractSlotContent() {
		if (!hasSlotContent || !slotContainer) return;

		await tick();
		// Extract text content from slot
		const textContent = slotContainer.textContent?.trim() || '';
		if (textContent) {
			diagramContent = textContent;
			// Hide the slot container since we've extracted the content
			slotContainer.style.display = 'none';
		}
	}

	function clearDiagramCache() {
		// Clear sessionStorage cache for fresh styling
		try {
			const keys = Object.keys(sessionStorage);
			keys.forEach(key => {
				if (key.startsWith('mermaid-cache-')) {
					sessionStorage.removeItem(key);
				}
			});
		} catch (e) {
			console.warn('[MermaidDiagram] Could not clear cache:', e);
		}
	}

	async function renderDiagram() {
		if (!effectiveDiagram || !effectiveDiagram.trim()) {
			error = true;
			errorMessage = 'No diagram content provided';
			rendered = true;
			return;
		}

		try {
			// Wait for container to be available
			if (!container) {
				await tick();
				await new Promise((resolve) => setTimeout(resolve, 100));
			}

			// Check cache first (but skip if we want to force refresh)
			const cachedSVG = getCachedSVG(effectiveDiagram);
			if (cachedSVG && container) {
				console.log('[MermaidDiagram] Using cached SVG');
				container.innerHTML = cachedSVG;
				optimizeSVG();
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

			// Initialize with comprehensive theme and diagram-specific settings
			status = 'initializing';
			const isMobile = window.innerWidth <= 768;

			mermaid.initialize({
				startOnLoad: false,
				securityLevel: 'loose',
				logLevel: 'error', // Reduce console noise
				...MERMAID_THEME,
				// Flowchart configuration
				flowchart: {
					useMaxWidth: true,
					htmlLabels: true,
					curve: 'basis',
					padding: 20
				},
				// Sequence diagram configuration
				sequence: {
					useMaxWidth: true,
					wrap: isMobile,
					actorMargin: 50,
					width: 150,
					height: 65,
					boxMargin: 10,
					boxTextMargin: 5,
					noteMargin: 10,
					messageMargin: 35
				},
				// State diagram configuration
				state: {
					useMaxWidth: true
				},
				// Git graph configuration
				gitGraph: {
					useMaxWidth: true,
					mainBranchName: 'main'
				},
				// Class diagram configuration
				class: {
					useMaxWidth: true
				},
				// Pie chart configuration
				pie: {
					useMaxWidth: true,
					textPosition: 0.75
				},
				// Gantt chart configuration
				gantt: {
					useMaxWidth: true,
					leftPadding: 75,
					gridLineStartPadding: 35,
					fontSize: 11,
					sectionFontSize: 24,
					numberSectionStyles: 4
				}
			});

			// Ensure container exists
			await tick();
			if (!container) {
				await new Promise((resolve) => setTimeout(resolve, 50));
				await tick();
			}

			if (!container) {
				throw new Error('Container element not available');
			}

			// Generate unique ID
			const id = `mermaid-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

			console.log('[MermaidDiagram] Rendering with ID:', id);
			status = 'rendering';

			// Render the diagram
			const renderResult = await mermaid.render(id, effectiveDiagram.trim());

			if (!renderResult || !renderResult.svg) {
				throw new Error('No SVG returned from render');
			}

			// Cache the rendered SVG
			setCachedSVG(effectiveDiagram, renderResult.svg);

			// Insert SVG
			container.innerHTML = renderResult.svg;
			currentSvgContent = renderResult.svg;

			// Optimize SVG
			optimizeSVG();

			rendered = true;
			status = 'complete';

			// Clean up orphaned elements
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

	function optimizeSVG() {
		if (!container) return;

		const svgElement = container.querySelector('svg');
		if (!svgElement) return;

		// Add accessibility attributes
		svgElement.setAttribute('role', 'img');
		svgElement.setAttribute(
			'aria-label',
			`Mermaid diagram: ${effectiveDiagram.split('\n')[0].trim()}`
		);

		// Optimize viewBox for better scaling
		const bbox = svgElement.getBBox();
		if (bbox.width > 0 && bbox.height > 0) {
			const padding = 10;
			svgElement.setAttribute(
				'viewBox',
				`${bbox.x - padding} ${bbox.y - padding} ${bbox.width + 2 * padding} ${bbox.height + 2 * padding}`
			);
			svgElement.setAttribute('preserveAspectRatio', 'xMidYMid meet');
		}

		// Check scrollability
		checkScrollability();
	}

	function checkScrollability() {
		if (!container) return;

		const svg = container.querySelector('svg');
		if (!svg) return;

		const svgWidth = svg.getBoundingClientRect().width;
		containerWidth = container.getBoundingClientRect().width;
		isScrollable = svgWidth > containerWidth + 10;
	}

	function openFullscreen() {
		showFullscreen = true;
	}

	function closeFullscreen() {
		showFullscreen = false;
	}

	// Lazy loading with IntersectionObserver
	function setupLazyLoading() {
		if (!useLazyLoading || !container) return;

		const observer = new IntersectionObserver(
			(entries) => {
				entries.forEach((entry) => {
					if (entry.isIntersecting && !isInViewport) {
						isInViewport = true;
						observer.disconnect();
					}
				});
			},
			{ rootMargin }
		);

		observer.observe(container);

		return () => observer.disconnect();
	}

	onMount(() => {
		isMounted = true;

		// Extract slot content if present
		if (hasSlotContent) {
			extractSlotContent().then(() => {
				if (isInViewport && effectiveDiagram) {
					renderDiagram();
				}
			});
		} else if (isInViewport && effectiveDiagram) {
			renderDiagram();
		}

		// Set up lazy loading if enabled
		const cleanupLazy = setupLazyLoading();

		// Handle resize events
		function handleResize() {
			checkScrollability();
		}

		window.addEventListener('resize', handleResize);

		// Cleanup
		return () => {
			cleanupLazy?.();
			window.removeEventListener('resize', handleResize);
		};
	});

	// Watch for viewport changes when lazy loading
	$: if (isInViewport && isMounted && effectiveDiagram && !rendered && !error) {
		renderDiagram();
	}
</script>

<div
	bind:this={container}
	class="mermaid-container relative flex justify-center overflow-x-auto rounded-lg bg-zinc-900 p-4"
	data-scrollable={isScrollable}
	style="min-height: {height}px"
>
	<!-- Hidden slot container for content extraction -->
	{#if hasSlotContent}
		<div bind:this={slotContainer} class="sr-only">
			<slot />
		</div>
	{/if}

	<!-- Loading state -->
	{#if !rendered && isMounted && isInViewport}
		<div class="absolute inset-0 flex items-center justify-center">
			<div class="text-center">
				<Loading />
				<p class="mt-2 text-sm text-zinc-400">{status}</p>
			</div>
		</div>
	{/if}

	<!-- Error state -->
	{#if error}
		<div
			transition:fade={{ duration: 200 }}
			class="flex flex-col items-center justify-center text-red-400"
			style="height: {height}px"
		>
			<p class="font-bold">Error rendering diagram</p>
			<p class="mt-2 text-sm">{errorMessage}</p>
			<details class="mt-4 w-full max-w-2xl">
				<summary class="cursor-pointer text-sm hover:underline">View Diagram Source</summary>
				<pre class="mt-2 overflow-x-auto rounded bg-zinc-800 p-2 text-xs">{effectiveDiagram}</pre>
			</details>
		</div>
	{/if}

	<!-- Rendered diagram container -->
	<div
		class="mermaid-render-container"
		class:hidden={!rendered || error}
		transition:fade={{ duration: 300 }}
	></div>

	<!-- Fullscreen button (mobile only) -->
	{#if rendered && !error && isMounted && window.innerWidth <= 768}
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

	<!-- Placeholder for lazy loading -->
	{#if !isInViewport && useLazyLoading}
		<div class="flex items-center justify-center" style="height: {height}px">
			<p class="text-zinc-400">Diagram will load when visible</p>
		</div>
	{/if}
</div>

<!-- Fullscreen modal -->
{#if showFullscreen}
	<MermaidFullscreen
		svgContent={currentSvgContent}
		isOpen={showFullscreen}
		onClose={closeFullscreen}
	/>
{/if}

<style>
	.mermaid-container {
		margin: 1.5rem 0;
		text-align: center;
	}

	.hidden {
		display: none;
	}

	.sr-only {
		position: absolute;
		width: 1px;
		height: 1px;
		padding: 0;
		margin: -1px;
		overflow: hidden;
		clip: rect(0, 0, 0, 0);
		white-space: nowrap;
		border-width: 0;
	}

	:global(.mermaid-render-container svg) {
		max-width: 100%;
		height: auto;
		display: block;
		margin: 0 auto;
	}

	/* Fullscreen button styling */
	.fullscreen-button {
		position: absolute;
		top: 0.5rem;
		right: 0.5rem;
		background: rgba(63, 63, 70, 0.9);
		color: rgb(228, 228, 231);
		border: 1px solid rgb(82, 82, 91);
		border-radius: 0.375rem;
		padding: 0.375rem;
		cursor: pointer;
		transition: all 0.2s ease;
		opacity: 0.7;
		z-index: 10;
	}

	.fullscreen-button:hover {
		opacity: 1;
		background: rgb(82, 82, 91);
		border-color: rgb(52, 211, 153);
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
