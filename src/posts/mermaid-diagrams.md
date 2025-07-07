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

<MermaidDiagram height={250}
diagram={`gitGraph
	  commit
	  branch develop
	  checkout develop
	  commit
	  branch feature/mermaid
	  checkout feature/mermaid
	  commit
	  commit
	  checkout develop
	  merge feature/mermaid
	  checkout main
	  merge develop
	  commit`}
/>

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