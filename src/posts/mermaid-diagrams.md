---
title: Rendering Mermaid Diagrams on Blog Posts
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
	  accTitle: CI/CD Deployment Pipeline
	  accDescr: This flowchart shows a typical CI/CD deployment pipeline. It starts with a developer push, goes through a CI pipeline that either passes or fails tests. If tests pass, the system builds a Docker image, pushes it to a registry, deploys to Kubernetes, and updates the service. If tests fail, it notifies the developer.
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
	  accTitle: OAuth2 Authentication Flow
	  accDescr: This sequence diagram shows the OAuth2 authentication flow between a user, client app, authorization server, and resource server. The user initiates a login request, the client redirects to the auth server, the user provides credentials, the auth server validates and returns an authorization code, the client exchanges the code for an access token, and finally uses the token to access protected resources.
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
	  accTitle: Order Processing State Machine
	  accDescr: This state diagram shows the possible states and transitions in an order processing system. Orders start in a Pending state, can move to Processing when payment is confirmed or to Cancelled if they timeout. From Processing, orders can be Shipped when items are packed or Refunded upon customer request. Shipped orders become Delivered when the package is received. All final states (Delivered, Cancelled, Refunded) end the process.
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

### Entity Relationship

Database schema for a blog:

<MermaidDiagram height={300}
diagram={`erDiagram
	  accTitle: Blog Database Schema
	  accDescr: This entity relationship diagram shows the database schema for a blog system. Users can write many posts, posts can have many comments, and posts belong to one category. The diagram shows the relationships between USER, POST, COMMENT, and CATEGORY entities with their respective fields and data types.
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
	  accTitle: Technology Stack Distribution
	  accDescr: This pie chart shows the distribution of technologies used in the project. SvelteKit makes up 35%, TypeScript 25%, Tailwind CSS 20%, MDsveX 15%, and Tooling 5% of the technology stack.
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

## Bonus: Code Blocks with Shiki and MDsveX

I've added code blocks with:

1. Syntax Highlighting
2. Line Numbers
3. Copy Button

Bash:

```bash
k get nodes
NAME    STATUS   ROLES           AGE   VERSION
k8s-1   Ready    control-plane   51d   v1.33.1
k8s-2   Ready    control-plane   51d   v1.33.1
k8s-3   Ready    control-plane   51d   v1.33.1
```

Rust:

```rust
fn main() {
    println!("Hello, world!");
}
```

---

_See how I did it: https://github.com/wcygan/wcygan.github.io/pull/30_