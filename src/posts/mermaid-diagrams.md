---
title: Mermaid
date: June 25, 2025
description: Using Mermaid.js to create diagrams in markdown blog posts
tags: [Mermaid, Visualization, Diagrams]
---

<script>
  import MermaidDiagram from '$lib/components/MermaidDiagram.svelte'
</script>

I've integrated [Mermaid.js](https://mermaid.js.org/) into this blog to create
interactive diagrams directly in markdown. This enables clear visualization of
architectures, workflows, and processes.

## Examples

### Flow Chart

Here's a simple deployment flow:

<MermaidDiagram height={300}
diagram={`flowchart TD
	  A[Developer Push] --> B{CI Pipeline}
	  B -->|Tests Pass| C[Build Docker Image]
	  B -->|Tests Fail| D[Notify Developer]
	  C --> E[Push to Registry]
	  E --> F[Deploy to Kubernetes]
	  F --> G[Update Service]`}
/>

### Sequence Diagram

API authentication flow:

<MermaidDiagram height={500}
diagram={`sequenceDiagram
	  participant User
	  participant Client as Client App
	  participant Auth as Auth Server
	  participant Resource as Resource Server
	  User->>Client: Login Request
	  Client->>Auth: Authorization Request
	  Auth->>User: Login Page
	  User->>Auth: Credentials
	  Auth->>Auth: Validate
	  Auth->>Client: Authorization Code
	  Client->>Auth: Exchange Code for Token
	  Auth->>Client: Access Token
	  Client->>Resource: API Request with Token
	  Resource->>Resource: Validate Token
	  Resource->>Client: Protected Data
	  Client->>User: Display Data`}
/>

### State Diagram

Order processing states:

<MermaidDiagram height={350}
diagram={`stateDiagram-v2
	  [*] --> Pending
	  Pending --> Processing: Payment Confirmed
	  Pending --> Cancelled: Timeout
	  Processing --> Shipped: Items Packed
	  Processing --> Refunded: Customer Request
	  Shipped --> Delivered: Package Received
	  Delivered --> [*]
	  Cancelled --> [*]
	  Refunded --> [*]`}
/>

### Git Flow

<MermaidDiagram height={350}
diagram={`gitGraph
	  accTitle: Git Flow Branching Model
	  accDescr: This diagram shows a typical Git Flow workflow. The main branch (green) represents production code. A develop branch (sky blue) is created for ongoing development. A feature branch called feature/mermaid (orange) is created from develop for implementing the Mermaid.js feature. After two commits on the feature branch, it merges back into develop. Finally, develop merges into main for release, followed by a hotfix commit on main.
	  commit id: "Initial commit"
	  branch develop
	  checkout develop
	  commit id: "Set up development"
	  branch feature/mermaid
	  checkout feature/mermaid
	  commit id: "Add Mermaid component"
	  commit id: "Style Mermaid diagrams"
	  checkout develop
	  merge feature/mermaid tag: "feature complete"
	  checkout main
	  merge develop tag: "v1.0.0"
	  commit id: "Hotfix: security patch"`}
/>

<div class="rounded-lg bg-zinc-700/50 border border-zinc-600 p-4 my-4 text-sm">
  <h4 class="text-zinc-300 font-semibold mb-2">Text Alternative: Git Flow Process</h4>
  <div class="text-zinc-400 space-y-2">
    <p><strong>Branch Structure:</strong></p>
    <ul class="list-disc list-inside ml-4">
      <li><span class="text-emerald-400">Main branch</span> (green) - Production-ready code</li>
      <li><span class="text-sky-400">Develop branch</span> (sky blue) - Integration branch for features</li>
      <li><span class="text-orange-400">Feature/mermaid branch</span> (orange) - Feature development branch</li>
    </ul>
    <p><strong>Workflow Steps:</strong></p>
    <ol class="list-decimal list-inside ml-4">
      <li>Start with initial commit on main</li>
      <li>Create develop branch from main</li>
      <li>Create feature/mermaid branch from develop</li>
      <li>Make commits on feature branch: "Add Mermaid component" and "Style Mermaid diagrams"</li>
      <li>Merge feature/mermaid back into develop (tagged "feature complete")</li>
      <li>Merge develop into main for release (tagged "v1.0.0")</li>
      <li>Apply hotfix directly to main: "Hotfix: security patch"</li>
    </ol>
  </div>
</div>

### Entity Relationship

Database schema for a blog:

<MermaidDiagram height={300}
diagram={`erDiagram
	  USER ||--o{ POST : writes
	  USER {
	      int id PK
	      string name
	      string email
	      datetime created_at
	  }
	  POST ||--o{ COMMENT : has
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
	  }
	  POST }o--|| CATEGORY : belongs_to
	  CATEGORY {
	      int id PK
	      string name
	      string slug
	  }`}
/>

### Pie Chart

Technology stack distribution:

<MermaidDiagram height={300}
diagram={`pie title Technology Stack
	  "SvelteKit" : 35
	  "TypeScript" : 25
	  "Tailwind CSS" : 20
	  "MDsveX" : 15
	  "Tooling" : 5`}
/>

## Usage in Markdown

In a blog post, I can use Mermaid like this:

```markdown
<script>
  import MermaidDiagram from '$lib/components/MermaidDiagram.svelte'
</script>

<MermaidDiagram height={300}
diagram={`flowchart LR
	  Start --> Process --> End`} />
```

---

_See how I did it: https://github.com/wcygan/wcygan.github.io/pull/30_