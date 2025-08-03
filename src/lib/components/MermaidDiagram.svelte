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
	let mermaidInstance: typeof import('mermaid').default | null = null;

	// Check if we have slot content
	$: hasSlotContent = $$slots.default;
	$: effectiveDiagram = diagramContent || diagram;

	// Light theme configuration following design.md specifications
	const MERMAID_THEME = {
		theme: 'base' as const,
		themeVariables: {
			// Base colors - matching design.md exactly
			background: '#ffffff', // White background
			primaryColor: '#f9f9f9', // Light gray for nodes (code block background)
			primaryBorderColor: '#5c8b3f', // Primary green for borders
			primaryTextColor: '#000000', // Black text
			secondaryColor: '#f9f9f9', // Light gray for secondary elements
			tertiaryColor: '#ffffff', // White for tertiary

			// Node styling (flowcharts, general) - light theme
			nodeBkg: '#f9f9f9', // Light gray background for nodes
			nodeBorder: '#5c8b3f', // Primary green borders
			nodeTextColor: '#000000', // Black text on light nodes

			// Line colors - using design.md grays
			lineColor: '#666666', // Secondary gray for lines
			textColor: '#000000', // Black text

			// Special elements - light theme
			mainBkg: '#f9f9f9', // Light gray for main elements
			secondBkg: '#ffffff', // White for secondary background

			// Sequence diagram specific - light theme colors
			actorBkg: '#f9f9f9', // Light gray for actor boxes
			actorBorder: '#5c8b3f', // Primary green for actor borders
			actorTextColor: '#000000', // Black text on light actor boxes
			actorLineColor: '#666666', // Secondary gray for actor lines
			signalColor: '#666666', // Secondary gray for signals
			signalTextColor: '#000000', // Black text for messages
			labelBoxBkgColor: '#f9f9f9', // Light gray for label boxes
			labelBoxBorderColor: '#5c8b3f', // Primary green for label borders
			labelTextColor: '#000000', // Black text for labels
			loopTextColor: '#000000', // Black text for loops
			noteBorderColor: '#5c8b3f', // Primary green for note borders
			noteBkgColor: '#f9f9f9', // Light gray for notes
			noteTextColor: '#000000', // Black text for notes
			activationBorderColor: '#5c8b3f', // Primary green for activation borders
			activationBkgColor: '#f9f9f9', // Light gray for activation background
			sequenceNumberColor: '#000000', // Black text for sequence numbers

			// State diagram specific - light theme
			specialStateColor: '#5c8b3f', // Primary green for special states
			innerEndBackground: '#f9f9f9', // Light gray for inner backgrounds
			compositeBackground: '#f9f9f9', // Light gray for composite backgrounds
			compositeTitleBackground: '#ffffff', // White for title backgrounds

			// Class diagram specific - light theme
			classText: '#000000', // Black text for classes

			// Design.md-compatible color palette with accessibility
			// Primary green as the main accent, with supporting colors
			git0: '#5c8b3f', // Primary green (design.md)
			git1: '#2e6810', // Link green (design.md)
			git2: '#E69F00', // Orange (colorblind-safe, high contrast)
			git3: '#0072B2', // Blue (colorblind-safe, high contrast)
			git4: '#CC79A7', // Purple (colorblind-safe)
			git5: '#009E73', // Teal (colorblind-safe)
			git6: '#D55E00', // Red-orange (colorblind-safe)
			git7: '#F0E442', // Yellow (colorblind-safe)

			// Extended palette for complex diagrams - design.md compatible
			pie1: '#5c8b3f', // Primary green (design.md)
			pie2: '#2e6810', // Link green (design.md)
			pie3: '#E69F00', // Orange (colorblind-safe)
			pie4: '#0072B2', // Blue (colorblind-safe)
			pie5: '#CC79A7', // Purple (colorblind-safe)
			pie6: '#009E73', // Teal (colorblind-safe)
			pie7: '#D55E00', // Red-orange (colorblind-safe)
			pie8: '#F0E442', // Yellow (colorblind-safe)
			pie9: '#666666', // Secondary gray (design.md)
			pie10: '#aaaaaa', // Light gray (design.md)
			pie11: '#dedede', // Border gray (design.md)
			pie12: '#000000', // Black (design.md)

			// Gantt chart specific - design.md compatible colors
			section0: '#5c8b3f', // Primary green (main tasks)
			section1: '#2e6810', // Link green (secondary tasks)
			section2: '#E69F00', // Orange (tertiary tasks)
			section3: '#0072B2', // Blue (data tasks)

			// Additional semantic colors for various diagram types
			// Sequence diagram variations - design.md colors
			actorBorder2: '#2e6810', // Link green (secondary actors)
			actorBorder3: '#E69F00', // Orange (tertiary actors)
			// Flowchart node types - design.md compatible
			processColor: '#5c8b3f', // Primary green (process nodes)
			decisionColor: '#E69F00', // Orange (decision nodes)
			dataColor: '#0072B2', // Blue (data nodes)

			// Git flow specific text colors - black on light background
			gitBranchLabel0: '#000000', // Black text (main branch)
			gitBranchLabel1: '#000000', // Black text (develop branch)
			gitBranchLabel2: '#000000', // Black text (feature branch)
			gitBranchLabel3: '#000000', // Black text (additional branch)
			gitBranchLabel4: '#000000', // Black text (branch 4)
			gitBranchLabel5: '#000000', // Black text (branch 5)
			gitBranchLabel6: '#000000', // Black text (branch 6)
			gitBranchLabel7: '#000000', // Black text (branch 7)
			gitInnerCommitLabel: '#000000', // Black text (commit ID)
			gitBranchLabelColor: '#000000', // Black text (general branch label)
			gitLabelColor: '#000000', // Black text (general git label)
			commitLabelFontSize: '16px', // Increased for better readability
			commitLabelColor: '#000000', // Black text (commit text)

			// General styling - light theme
			clusterBkg: '#f9f9f9', // Light gray clusters
			clusterBorder: '#dedede', // Light border for clusters
			defaultLinkColor: '#666666', // Secondary gray for links
			titleColor: '#5c8b3f', // Primary green for titles
			edgeLabelBackground: '#ffffff', // White for edge labels

			// Error colors - light theme compatible
			errorBkgColor: '#f9f9f9', // Light gray background for errors
			errorTextColor: '#D55E00', // Red-orange for error text (colorblind-safe)

			// Font settings - matching design.md
			fontFamily: 'system, -apple-system, "system-ui", "Helvetica Neue", "Lucida Grande", sans-serif',
			fontSize: '16px' // Clear, readable font size
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
					mainBranchName: 'main',
					showBranches: true,
					showCommitLabel: true
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
	class="mermaid-container relative flex justify-center overflow-x-auto rounded-lg p-4"
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
		background: rgb(249, 249, 249);  /* Light gray background from design.md */
		border: 1px solid rgb(222, 222, 222);  /* Light border from design.md */
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
