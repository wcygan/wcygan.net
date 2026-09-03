# Processes and Threads: Visualizations and Architecture

This reference describes how the animations, diagrams, and interactive simulations in PlanetScale's **"Processes and Threads"** blog post are constructed, styled, and vendored.

- **Blog post**: `https://planetscale.com/blog/processes-and-threads`
- **Vendored bundle location**: `.agents/skills/planet-scale-animation-design-system/assets/processes-and-threads/`
- **Served public path**: `/vendor/planetscale/processes-and-threads/`
- **Bundle entrypoint**: `iframe-DRKIPuh6.js` (with preloaded `index-Brfk6Bdo.js`, `modulepreload-polyfill-B5Qt9EMX.js`, and `styles-CWGXrFsx.css`)

---

## 1. Overview and Topics Covered

The article explores low-level operating system abstractions and how they impact database server concurrency:

1. **CPU and RAM execution loop**: instruction fetching, register assignments, arithmetic logic units, and RAM cell storage.
2. **Context switching**: register state swapping, kernel mode transitions, and scheduler queues.
3. **Process states**: interactive state machine displaying transitions among `NEW`, `READY`, `RUNNING`, `WAITING`, and `TERMINATED`.
4. **Process creation and execution (`fork()` & `exec()`)**: memory duplication, separate virtual address spaces, copy-on-write semantics.
5. **POSIX Threads (`pthread_create`)**: shared address space, isolated thread stacks, register sets, concurrent work distribution.
6. **Connection pooling**: thread-per-connection vs pooled connections in relational databases (PostgreSQL and MySQL).

---

## 2. Interactive Demonstrations & Fragment Hash Routing

The bundle mounts within a self-contained iframe shell `#app`. Upon loading, it reads `document.URL.split("#")[1]` and mounts a container `<div data-id="{fragment}"></div>`. The bundle's component classes observe matching elements and instantiate runtime models.

| Fragment Hash                         | Section / Title           | Visual Type       | Renderer & Description                                                                |
| :------------------------------------ | :------------------------ | :---------------- | :------------------------------------------------------------------------------------ |
| `#pat-display-title`                  | Header title              | Animated Title    | GSAP / rAF typing effect ("Processes and Threads")                                    |
| `#pat-cpu`                            | CPU and RAM               | Dynamic SVG       | CPU register visualizer (`$0`, `$1`, `$2`), instruction pointer, and ALU bus          |
| `#pat-ram`                            | CPU and RAM               | Dynamic SVG       | Memory address matrix (`0x00` - `0x0F`) showing instructions and data cells           |
| `#pat-instruction-reference`          | Instruction sets          | SVG Table         | Assembly reference card showing `SET`, `ADD`, `PRINTI`, `HALT`                        |
| `#pat-cpu-ram-simple`                 | Instruction sets          | Interactive SVG   | Step-by-step program execution simulator showing registers and memory updates         |
| `#pat-2-simple`                       | Running multiple programs | Dual Stepper      | Two concurrent program states executing independently                                 |
| `#pat-context-switcher`               | Context switching         | Interactive SVG   | Interactive context switcher demonstrating state save/restore overhead                |
| `#pat-process-states`                 | Process states            | State Machine SVG | FSM with animated state nodes: `NEW` → `READY` ⇄ `RUNNING` → `WAITING` → `TERMINATED` |
| `#pat-instruction-reference-fork`     | Process creation          | SVG Card          | Assembly reference for `FORK` system call semantics                                   |
| `#pat-fork`                           | Forking processes         | Animated Tree     | Process tree showing PID 1000 cloning into child PID 1001 with duplicated state       |
| `#pat-instruction-reference-exec`     | Executing programs        | SVG Card          | Assembly reference for `EXEC` system call semantics                                   |
| `#pat-fork-exec`                      | Fork and Exec             | Flow Diagram      | Process replacement lifecycle (`fork()` followed by `exec()`)                         |
| `#pat-sum`                            | Threaded execution        | Progress Meter    | Single-threaded iterative loop summing an array                                       |
| `#pat-sum-threads`                    | Multi-threading           | Split Progress    | Parallel thread execution splitting array partitions among 4 POSIX threads            |
| `#pat-instruction-reference-ptcreate` | POSIX threads             | SVG Card          | Reference documentation for `pthread_create()` arguments and behavior                 |
| `#pat-min-max`                        | Work partitioning         | Bar Chart         | Visual distribution of work across thread ranges                                      |
| `#pat-connection-pooling`             | Connection pooling        | Interactive Sim   | Database connection pool simulator comparing thread-per-client against pooled queues  |

---

## 3. Implementation Details

- **Rendering Engine**: Dynamic SVG constructed via DOM manipulation and GSAP / D3 math helpers.
- **Color Tokens**: Adheres to PlanetScale's CSS variable token scheme (`--diagram-bg`, `--diagram-fg`, `--diagram-accent`, `--diagram-blue`, `--diagram-green`, `--diagram-red`, `--diagram-yellow`).
- **Interactive Controls**: Play/pause/step controls, execution scrubbers, memory inspect highlights, and interactive toggles.
- **Replicating Locally**: Embed via `VendoredDemoFigure.tsx` passing `src="/vendor/planetscale/processes-and-threads/index.html"` and `hash="pat-connection-pooling"` (or any hash above).
