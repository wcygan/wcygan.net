<script lang="ts">
	import { onMount } from 'svelte';
	import { fade } from 'svelte/transition';

	export let svgContent: string = '';
	export let isOpen = false;
	export let onClose: () => void;

	let dialogElement: HTMLDialogElement;
	let containerElement: HTMLDivElement;

	function handleClose() {
		isOpen = false;
		onClose();
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape') {
			handleClose();
		}
	}

	onMount(() => {
		if (isOpen && dialogElement) {
			dialogElement.showModal();
		}

		return () => {
			if (dialogElement && dialogElement.open) {
				dialogElement.close();
			}
		};
	});

	$: if (dialogElement) {
		if (isOpen) {
			dialogElement.showModal();
			// Apply SVG content to container
			if (containerElement && svgContent) {
				containerElement.innerHTML = svgContent;
				// Ensure SVG fills the viewport
				const svg = containerElement.querySelector('svg');
				if (svg) {
					svg.setAttribute('width', '100%');
					svg.setAttribute('height', '100%');
					svg.style.maxWidth = '90vw';
					svg.style.maxHeight = '90vh';
				}
			}
		} else {
			dialogElement.close();
		}
	}
</script>

{#if isOpen}
	<dialog
		bind:this={dialogElement}
		class="mermaid-fullscreen-dialog"
		transition:fade={{ duration: 200 }}
		on:keydown={handleKeydown}
	>
		<div class="fullscreen-container">
			<button class="close-button" on:click={handleClose} aria-label="Close fullscreen view">
				<svg
					width="24"
					height="24"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
				>
					<line x1="18" y1="6" x2="6" y2="18"></line>
					<line x1="6" y1="6" x2="18" y2="18"></line>
				</svg>
			</button>

			<div bind:this={containerElement} class="diagram-container"></div>
		</div>
	</dialog>
{/if}

<style>
	.mermaid-fullscreen-dialog {
		position: fixed;
		inset: 0;
		width: 100vw;
		height: 100vh;
		max-width: 100vw;
		max-height: 100vh;
		margin: 0;
		padding: 0;
		border: none;
		background: rgba(24, 24, 27, 0.95); /* zinc-900 with opacity */
		backdrop-filter: blur(10px);
		z-index: 9999;
	}

	.mermaid-fullscreen-dialog::backdrop {
		background: rgba(0, 0, 0, 0.8);
	}

	.fullscreen-container {
		width: 100%;
		height: 100%;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 2rem;
		position: relative;
	}

	.close-button {
		position: absolute;
		top: 1rem;
		right: 1rem;
		background: rgb(63, 63, 70); /* zinc-700 */
		color: rgb(228, 228, 231); /* zinc-100 */
		border: 1px solid rgb(82, 82, 91); /* zinc-600 */
		border-radius: 0.5rem;
		padding: 0.5rem;
		cursor: pointer;
		transition: all 0.2s ease;
		z-index: 10;
	}

	.close-button:hover {
		background: rgb(82, 82, 91); /* zinc-600 */
		border-color: rgb(52, 211, 153); /* emerald-400 */
		transform: scale(1.05);
	}

	.diagram-container {
		width: 100%;
		height: 100%;
		display: flex;
		align-items: center;
		justify-content: center;
		overflow: auto;
		-webkit-overflow-scrolling: touch;
	}

	/* Mobile optimizations */
	@media (max-width: 768px) {
		.fullscreen-container {
			padding: 1rem;
		}

		.close-button {
			top: 0.5rem;
			right: 0.5rem;
		}
	}

	/* Global styles for fullscreen SVGs */
	:global(.mermaid-fullscreen-dialog svg) {
		display: block;
		margin: 0 auto;
	}
</style>
