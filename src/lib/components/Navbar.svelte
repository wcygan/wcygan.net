<script lang="ts">
	interface NavItem {
		href: string;
		label: string;
		external?: boolean;
		icon?: string;
	}

	const navItems: NavItem[] = [
		{ href: '/', label: 'Home' },
		{ href: '/about', label: 'About' },
		{ href: '/will_cygan_resume.pdf', label: 'Resume', external: true },
		{
			href: 'https://github.com/wcygan',
			label: 'GitHub',
			external: true,
			icon: '/icons/github-light.svg'
		},
		{
			href: 'https://www.linkedin.com/in/wcygan',
			label: 'LinkedIn',
			external: true,
			icon: '/icons/linkedin.svg'
		}
	];

	let mobileMenuOpen = $state(false);

	function toggleMobileMenu() {
		mobileMenuOpen = !mobileMenuOpen;
	}

	function closeMobileMenu() {
		mobileMenuOpen = false;
	}
</script>

<nav class="sticky top-0 z-10 border-b border-zinc-700/50 bg-zinc-800/95 backdrop-blur-sm">
	<div class="mx-auto max-w-3xl px-4 py-3 md:max-w-4xl md:py-6">
		<!-- Desktop Navigation -->
		<div class="hidden justify-center gap-6 md:flex">
			{#each navItems as { href, label, external, icon }}
				<a
					{href}
					class="flex items-center gap-1 text-zinc-100 transition-all duration-200 hover:text-emerald-400"
					target={external ? '_blank' : undefined}
					rel={external ? 'noopener noreferrer' : undefined}
					aria-label={label}
				>
					{#if icon}
						<img src={icon} alt="" class="h-7 w-7" />
						<span class="sr-only">{label}</span>
					{:else}
						<span class="text-lg">{label}</span>
					{/if}
				</a>
			{/each}
		</div>

		<!-- Mobile Navigation -->
		<div class="md:hidden">
			<div class="flex items-center justify-between">
				<span class="text-lg font-semibold text-emerald-400">Will Cygan</span>
				<button
					onclick={toggleMobileMenu}
					class="p-2 text-zinc-100 transition-colors hover:text-emerald-400"
					aria-label="Toggle menu"
					aria-expanded={mobileMenuOpen}
				>
					{#if mobileMenuOpen}
						<!-- Close icon -->
						<svg
							xmlns="http://www.w3.org/2000/svg"
							class="h-6 w-6"
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M6 18L18 6M6 6l12 12"
							/>
						</svg>
					{:else}
						<!-- Hamburger icon -->
						<svg
							xmlns="http://www.w3.org/2000/svg"
							class="h-6 w-6"
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M4 6h16M4 12h16M4 18h16"
							/>
						</svg>
					{/if}
				</button>
			</div>

			<!-- Mobile menu dropdown -->
			{#if mobileMenuOpen}
				<div class="mt-4 space-y-2 pb-2">
					{#each navItems as { href, label, external, icon }}
						<a
							{href}
							class="flex items-center gap-2 rounded-lg px-4 py-2 text-zinc-100 transition-all duration-200 hover:bg-zinc-700/50 hover:text-emerald-400"
							target={external ? '_blank' : undefined}
							rel={external ? 'noopener noreferrer' : undefined}
							aria-label={label}
							onclick={closeMobileMenu}
						>
							{#if icon}
								<img src={icon} alt="" class="h-5 w-5" />
							{/if}
							<span class="text-base">{label}</span>
						</a>
					{/each}
				</div>
			{/if}
		</div>
	</div>
</nav>
