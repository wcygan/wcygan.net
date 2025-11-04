<script>
	import MermaidDiagram from '$lib/components/MermaidDiagram.svelte';
</script>

<article class="blog-post">
	<header class="post-header">
		<h1 class="post-title">Mermaid Diagram Examples</h1>
	</header>

	<div class="post-content">
		<p class="mb-8 text-lg">
			This page demonstrates all the different ways to use Mermaid diagrams in your SvelteKit
			application.
		</p>

		<section class="mb-12">
			<h2 class="mb-4 text-2xl font-semibold">Basic Flow Chart</h2>
			<p class="mb-4">Simple flowchart using MermaidDiagram component:</p>

			<MermaidDiagram
				height={250}
				diagram={`flowchart LR
        A[Start] --> B{Is it working?}
        B -->|Yes| C[Great!]
        B -->|No| D[Debug]
        D --> A`}
			/>
		</section>

		<section class="mb-12">
			<h2 class="mb-4 text-2xl font-semibold">Sequence Diagram with Viewport Loading</h2>
			<p class="mb-4">This diagram loads when you scroll it into view:</p>

			<MermaidDiagram
				height={400}
				useLazyLoading={true}
				diagram={`sequenceDiagram
        participant Browser
        participant Server
        participant Database
        
        Browser->>Server: HTTP Request
        Server->>Database: Query
        Database-->>Server: Results
        Server-->>Browser: JSON Response
        Note over Browser: Render UI`}
			/>
		</section>

		<section class="mb-12">
			<h2 class="mb-4 text-2xl font-semibold">State Diagram</h2>
			<p class="mb-4">Application state management flow:</p>

			<MermaidDiagram
				height={350}
				diagram={`stateDiagram-v2
        [*] --> Idle
        Idle --> Loading: Fetch data
        Loading --> Success: Data received
        Loading --> Error: Request failed
        Success --> Idle: Reset
        Error --> Idle: Retry
        Error --> [*]: Give up`}
			/>
		</section>

		<section class="mb-12">
			<h2 class="mb-4 text-2xl font-semibold">Entity Relationship Diagram</h2>
			<p class="mb-4">Database schema visualization:</p>

			<MermaidDiagram
				height={400}
				diagram={`erDiagram
        USER ||--o{ POST : writes
        USER ||--o{ COMMENT : writes
        POST ||--o{ COMMENT : has
        USER {
          int id PK
          string email UK
          string name
          datetime created_at
        }
        POST {
          int id PK
          int user_id FK
          string title
          text content
          datetime published_at
        }
        COMMENT {
          int id PK
          int post_id FK
          int user_id FK
          text content
          datetime created_at
        }`}
			/>
		</section>

		<section class="mb-12">
			<h2 class="mb-4 text-2xl font-semibold">Gantt Chart</h2>
			<p class="mb-4">Project timeline (with lazy loading):</p>

			<MermaidDiagram
				height={300}
				useLazyLoading={true}
				diagram={`gantt
        title Mermaid Integration Project
        dateFormat  YYYY-MM-DD
        section Research
        Deep web research     :done,    des1, 2025-01-25, 1d
        Analyze approaches    :done,    des2, after des1, 1d
        section Implementation
        Fix rendering issues  :done,    dev1, after des2, 1d
        Add error handling   :done,    dev2, after dev1, 1d
        Performance optimize :active,  dev3, after dev2, 2d
        section Documentation
        Write usage guide    :         doc1, after dev3, 1d
        Create examples     :         doc2, after doc1, 1d`}
			/>
		</section>

		<section class="mb-12">
			<h2 class="mb-4 text-2xl font-semibold">Git Graph</h2>
			<p class="mb-4">Version control workflow:</p>

			<MermaidDiagram
				height={250}
				diagram={`gitGraph
        commit id: "Initial commit"
        branch feature/mermaid
        checkout feature/mermaid
        commit id: "Add Mermaid component"
        commit id: "Fix rendering issues"
        commit id: "Add caching"
        checkout main
        merge feature/mermaid
        commit id: "Update docs"`}
			/>
		</section>

		<section class="mb-12">
			<h2 class="mb-4 text-2xl font-semibold">Pie Chart</h2>
			<p class="mb-4">Bundle size breakdown:</p>

			<MermaidDiagram
				height={300}
				diagram={`pie title Bundle Size Analysis
        "Application Code" : 386
        "Mermaid Library" : 2100
        "Other Dependencies" : 850
        "Svelte Runtime" : 45`}
			/>
		</section>

		<section class="mb-12">
			<h2 class="mb-4 text-2xl font-semibold">Class Diagram</h2>
			<p class="mb-4">Component architecture (with lazy loading):</p>

			<MermaidDiagram
				height={500}
				useLazyLoading={true}
				diagram={`classDiagram
        class MermaidDiagram {
          +height: number
          +diagram: string
          +useLazyLoading: boolean
          +rootMargin: string
          -container: HTMLElement
          -rendered: boolean
          +loadMermaid()
          +renderDiagram()
          +extractSlotContent()
        }
        
        class MermaidFullscreen {
          +svgContent: string
          +isOpen: boolean
          +onClose()
        }
        
        class MermaidCache {
          +getCachedSVG(diagram)
          +setCachedSVG(diagram, svg)
          -hashDiagram(diagram)
          -clearOldEntries()
        }
        
        MermaidDiagram ..> MermaidCache : uses
        MermaidDiagram ..> MermaidFullscreen : uses`}
			/>
		</section>

		<section class="mb-12">
			<h2 class="mb-4 text-2xl font-semibold">Flexible Usage Patterns</h2>
			<p class="mb-4">MermaidDiagram supports both prop and slot-based content:</p>

			<div class="space-y-6">
				<div>
					<p class="mb-2 text-sm">With prop:</p>
					<MermaidDiagram height={200} diagram="graph LR; A[Prop] --> B[Based]" />
				</div>

				<div>
					<p class="mb-2 text-sm">With slot content:</p>
					<MermaidDiagram height={200}>
						graph TD A[Slot] --> B[Based] B --> C[Content]
					</MermaidDiagram>
				</div>

				<div>
					<p class="mb-2 text-sm">With slot and lazy loading:</p>
					<MermaidDiagram height={200} useLazyLoading={true}>
						graph TD A[Lazy] --> B[Loading] B --> C[Slot Content]
					</MermaidDiagram>
				</div>
			</div>
		</section>

		<section class="mb-12">
			<h2 class="mb-4 text-2xl font-semibold">Error Handling Demo</h2>
			<p class="mb-4">This shows what happens with invalid syntax:</p>

			<MermaidDiagram
				height={200}
				diagram={`graph LR
        A[This --> B[Will]
        C[Fail`}
			/>
		</section>

		## Performance Tips - Use `useLazyLoading={true}` for diagrams below the fold - Diagrams are
		automatically cached in sessionStorage - The Mermaid library is dynamically imported on first
		use - Mobile devices get a fullscreen button for better viewing - All diagrams use a consistent
		light theme matching the design system ## Component Consolidation The Mermaid components have
		been consolidated into a single, powerful component: - **MermaidDiagram** - The main component
		supporting all features - **MermaidFullscreen** - Internal component for mobile fullscreen
		viewing The previous components (Mermaid, MermaidViewport, MermaidFlexible, MermaidLazy) have
		been deprecated and their functionality merged into MermaidDiagram.
	</div>
</article>
