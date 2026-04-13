import { createFileRoute } from '@tanstack/react-router'
import { MermaidDiagram } from '~/components/MermaidDiagram'

export const Route = createFileRoute('/mermaid-examples')({
  component: MermaidExamplesPage,
})

function MermaidExamplesPage() {
  return (
    <article className="blog-post">
      <header className="post-header">
        <h1 className="post-title">Mermaid Diagram Examples</h1>
      </header>

      <div className="post-content">
        <p className="mb-8 text-lg">
          This page demonstrates all the different ways to use Mermaid diagrams.
        </p>

        <section className="mb-12">
          <h2 className="mb-4 text-2xl font-semibold">Basic Flow Chart</h2>
          <p className="mb-4">
            Simple flowchart using MermaidDiagram component:
          </p>
          <MermaidDiagram
            height={250}
            diagram={`flowchart LR
        A[Start] --> B{Is it working?}
        B -->|Yes| C[Great!]
        B -->|No| D[Debug]
        D --> A`}
          />
        </section>

        <section className="mb-12">
          <h2 className="mb-4 text-2xl font-semibold">
            Sequence Diagram with Viewport Loading
          </h2>
          <p className="mb-4">
            This diagram loads when you scroll it into view:
          </p>
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

        <section className="mb-12">
          <h2 className="mb-4 text-2xl font-semibold">State Diagram</h2>
          <p className="mb-4">Application state management flow:</p>
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

        <section className="mb-12">
          <h2 className="mb-4 text-2xl font-semibold">
            Entity Relationship Diagram
          </h2>
          <p className="mb-4">Database schema visualization:</p>
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

        <section className="mb-12">
          <h2 className="mb-4 text-2xl font-semibold">Gantt Chart</h2>
          <p className="mb-4">Project timeline (with lazy loading):</p>
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

        <section className="mb-12">
          <h2 className="mb-4 text-2xl font-semibold">Git Graph</h2>
          <p className="mb-4">Version control workflow:</p>
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

        <section className="mb-12">
          <h2 className="mb-4 text-2xl font-semibold">Pie Chart</h2>
          <p className="mb-4">Bundle size breakdown:</p>
          <MermaidDiagram
            height={300}
            diagram={`pie title Bundle Size Analysis
        "Application Code" : 386
        "Mermaid Library" : 2100
        "Other Dependencies" : 850
        "Svelte Runtime" : 45`}
          />
        </section>

        <section className="mb-12">
          <h2 className="mb-4 text-2xl font-semibold">Class Diagram</h2>
          <p className="mb-4">
            Component architecture (with lazy loading):
          </p>
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
      </div>
    </article>
  )
}
