---
title: Agents
date: June 26, 2025
description: What is an AI Agent?
tags: [AI, Agents, LLMs]
---

<script>
  import MermaidDiagram from '$lib/components/MermaidDiagram.svelte';
  import InfoBox from '$lib/components/InfoBox.svelte';
</script>

## Quick Start

Google recently open-sourced [Gemini CLI](https://github.com/google-gemini/gemini-cli), an AI agent that lives in the terminal. You can quickly get it running with:

```bash
npm install -g @google/gemini-cli
gemini

 ███            █████████  ██████████ ██████   ██████ █████ ██████   █████ █████
░░░███         ███░░░░░███░░███░░░░░█░░██████ ██████ ░░███ ░░██████ ░░███ ░░███
  ░░░███      ███     ░░░  ░███  █ ░  ░███░█████░███  ░███  ░███░███ ░███  ░███
    ░░░███   ░███          ░██████    ░███░░███ ░███  ░███  ░███░░███░███  ░███
     ███░    ░███    █████ ░███░░█    ░███ ░░░  ░███  ░███  ░███ ░░██████  ░███
   ███░      ░░███  ░░███  ░███ ░   █ ░███      ░███  ░███  ░███  ░░█████  ░███
 ███░         ░░█████████  ██████████ █████     █████ █████ █████  ░░█████ █████
░░░            ░░░░░░░░░  ░░░░░░░░░░ ░░░░░     ░░░░░ ░░░░░ ░░░░░    ░░░░░ ░░░░░
```

## What is an "Agent"?

<InfoBox title="Insight">
  {#snippet children()}
    <p>AI agents are systems that can <strong>think</strong>, <strong>act</strong>, and <strong>learn</strong> from results. Unlike chatbots that only generate text, agents interact with the world through tools and APIs to complete real tasks.</p>
  {/snippet}
</InfoBox>

The core pattern is the **Thought-Action-Observation (TAO) loop**:

<MermaidDiagram
    height={500}
    diagram={`graph TD
    subgraph "TAO Loop"
        A[🤔 Think] --> B[⚡ Act]
        B --> C[👁️ Observe]
        C --> A
    end
    User[User Query] --> A
    B --> World[🌍 Real World]
    World --> C
    A --> Response[Final Answer]
    style A fill:#3f3f46,stroke:#34d399,stroke-width:3px
    style B fill:#3f3f46,stroke:#34d399
    style C fill:#3f3f46,stroke:#34d399
    style User fill:#52525b,stroke:#71717a
    style World fill:#52525b,stroke:#71717a
    style Response fill:#52525b,stroke:#71717a`}
/>

## Agents are Just Programs

<InfoBox title="Insight">
  {#snippet children()}
    <p><strong>Agents don't contain AI models!</strong> The Gemini CLI is simply a program that makes API calls to Google's external LLM servers. It's no different from a weather app calling a weather API—the intelligence lives in the "cloud", not in your terminal.</p>
  {/snippet}
</InfoBox>

The entire "agent" is just orchestration code:

<MermaidDiagram
    height={200}
    diagram={`graph LR
    A[💻 Terminal] --> B[📦 Gemini CLI]
    B --> C[🔒 HTTPS]
    C --> D[☁️ Google LLM]
    D --> E[📄 JSON]
    E --> B
    B --> F[🔧 Tools]
    F --> B
    style A fill:#3f3f46,stroke:#34d399,stroke-width:3px
    style B fill:#3f3f46,stroke:#34d399,stroke-width:3px
    style C fill:#3f3f46,stroke:#34d399,stroke-width:3px
    style D fill:#3f3f46,stroke:#34d399,stroke-width:3px
    style E fill:#3f3f46,stroke:#34d399,stroke-width:3px
    style F fill:#3f3f46,stroke:#34d399,stroke-width:3px`}
/>

---

## From Theory to Practice

When you ask "How many files are in the src directory?", the agent doesn't guess—it uses the TAO loop to gather real information. The key difference: **agents perform real-world actions**, while chatbots only process training data.

<MermaidDiagram
    height={600}
    diagram={`sequenceDiagram
    participant U as 👤 User
    participant C as 📦 CLI
    participant A as ☁️ API
    participant T as 🔧 Tools
    
    U->>C: "How many files in src?"
    Note over C: Parse & prepare request
    
    C->>A: POST {query: "How many files in src?", tools: [list_dir]}
    Note over A: LLM thinks:<br/>"I need to list files"
    
    A-->>C: {tool: "list_dir", path: "src/"}
    
    C->>T: Execute locally
    T-->>C: ["file1.ts", "file2.ts"]
    
    C->>A: POST {results: [...]}
    Note over A: Process results
    
    A-->>C: "There are 2 files"
    C-->>U: "2 files in src directory"`}
/>

---

## How Gemini Works: Streaming Architecture

Google built Gemini CLI around a **streaming-first design** that processes events in real-time. Instead of waiting for complete responses, it streams thoughts, actions, and results as they happen.

### The Four Core Components

<div class="grid grid-cols-1 md:grid-cols-4 gap-4 my-6">
  <div class="rounded-lg bg-zinc-700/50 border border-zinc-600 p-4">
    <h4 class="text-emerald-400 font-semibold mb-2">🔄 <a href="https://github.com/google-gemini/gemini-cli/blob/main/packages/core/src/core/geminiChat.ts#L133" class="hover:text-emerald-300">Conversation Manager</a></h4>
    <p class="text-zinc-300 text-sm">Handles the back-and-forth with Google's AI and manages conversation history</p>
  </div>
  <div class="rounded-lg bg-zinc-700/50 border border-zinc-600 p-4">
    <h4 class="text-emerald-400 font-semibold mb-2">⚙️ <a href="https://github.com/google-gemini/gemini-cli/blob/main/packages/core/src/core/coreToolScheduler.ts#L224" class="hover:text-emerald-300">Tool Scheduler</a></h4>
    <p class="text-zinc-300 text-sm">Manages when and how tools run, including safety approvals</p>
  </div>
  <div class="rounded-lg bg-zinc-700/50 border border-zinc-600 p-4">
    <h4 class="text-emerald-400 font-semibold mb-2">🔧 <a href="https://github.com/google-gemini/gemini-cli/blob/main/packages/core/src/tools/tool-registry.ts#L124" class="hover:text-emerald-300">Tool Registry</a></h4>
    <p class="text-zinc-300 text-sm">Library of available actions like reading files, running commands, web searches</p>
  </div>
  <div class="rounded-lg bg-zinc-700/50 border border-zinc-600 p-4">
    <h4 class="text-emerald-400 font-semibold mb-2">🖥️ <a href="https://github.com/google-gemini/gemini-cli/blob/main/packages/cli/src/ui/hooks/useGeminiStream.ts#L78" class="hover:text-emerald-300">User Interface</a></h4>
    <p class="text-zinc-300 text-sm">Terminal display that shows everything happening in real-time</p>
  </div>
</div>

<MermaidDiagram
    height={600}
    diagram={`graph TD
    subgraph "Gemini CLI Architecture"
        A[User Input] --> B[<a href="https://github.com/google-gemini/gemini-cli/blob/main/packages/core/src/core/geminiChat.ts#L133">Conversation Manager</a>]
        B --> C[Google AI API]
        C --> D{Response Type}
        D -->|thinking| E[🤔 Show Thoughts]
        D -->|text| F[💬 Show Content]
        D -->|tool_request| G[⚡ Schedule Tools]
        G --> H[<a href="https://github.com/google-gemini/gemini-cli/blob/main/packages/core/src/core/coreToolScheduler.ts#L224">Tool Scheduler</a>]
        H --> I{Safe to Run?}
        I -->|Yes| J[✅ Execute]
        I -->|No| K[⚠️ Ask User]
        K -->|Approved| J
        K -->|Denied| L[❌ Cancel]
        J --> M[📊 Get Results]
        M --> N[🔄 Feed Back to AI]
        N --> B
        E --> O[Terminal Display]
        F --> O
        G --> O
        M --> O
    end
    style B fill:#3f3f46,stroke:#34d399,stroke-width:3px
    style H fill:#3f3f46,stroke:#34d399,stroke-width:2px
    style C fill:#3f3f46,stroke:#34d399,stroke-width:2px
    style J fill:#3f3f46,stroke:#34d399,stroke-width:2px`}
/>

## Safety and Control

Gemini CLI has [three safety modes](https://github.com/google-gemini/gemini-cli/blob/221b0669000b8292795267cbf71a95ad39c5fb08/packages/core/src/config/config.ts#L44-L48):

- **🛡️ DEFAULT**: Ask permission for dangerous operations (delete files, run commands)
- **⚡ AUTO_EDIT**: Auto-approve file edits, but ask for everything else  
- **🚀 YOLO**: Run everything automatically (for experienced users)

<InfoBox title="Smart Safety">
  {#snippet children()}
    <p>The system can tell the difference between safe operations (reading files) and dangerous ones (deleting files). It only asks permission when it actually matters.</p>
  {/snippet}
</InfoBox>

## Real Example: Finding TypeScript Files

When you ask "Find all TypeScript files and analyze their imports", here's what happens:

<div class="rounded-lg bg-zinc-700/50 border border-zinc-600 p-4 my-6">
  <div class="space-y-3">
    <div><strong class="text-emerald-400">👤 You:</strong> "Find all TypeScript files and analyze their imports"</div>
    <div><strong class="text-zinc-400">🤔 AI Thinks:</strong> <em>"I need to find .ts files, then read each one to check imports"</em></div>
    <div><strong class="text-emerald-400">⚡ AI Acts:</strong> Runs <code>find_files("*.ts")</code> and multiple <code>read_file()</code> commands</div>
    <div><strong class="text-zinc-400">👁️ AI Observes:</strong> Gets list of files and their contents</div>
    <div><strong class="text-emerald-400">💬 AI Responds:</strong> "Found 15 TypeScript files. Here are the import patterns..."</div>
  </div>
</div>

## Extensible Tools

The [Tool Registry](https://github.com/google-gemini/gemini-cli/blob/main/packages/core/src/tools/tool-registry.ts#L124)
automatically discovers and loads tools from multiple sources—built-in capabilities, project-specific discovery commands, and
MCP servers. This means the AI's abilities expand dynamically based on your project's needs, whether that's connecting to
databases, GitHub APIs, or development environments through MCP protocol.

- Built-in tools for files, web, commands
- MCP (Model Context Protocol) server support
- Project-specific tool discovery

<MermaidDiagram
    height={350}
    diagram={`graph LR
    subgraph "Built-in Tools"
        A[📁 File Operations]
        B[🌐 Web Search]
        C[⚡ Shell Commands]
        D[🧠 Memory/Notes]
    end
    subgraph "Extensions"
        E[🔌 MCP Servers]
        G[🛠️ Project Tools]
    end
    A --> H[<a href="https://github.com/google-gemini/gemini-cli/blob/main/packages/core/src/tools/tool-registry.ts#L124">Tool Registry</a>]
    B --> H
    C --> H
    D --> H
    E --> H
    G --> H
    H --> I[AI can use any tool]
    style H fill:#3f3f46,stroke:#34d399,stroke-width:3px
    style I fill:#3f3f46,stroke:#34d399,stroke-width:2px`}
/>

---

## Key Takeaways

<div class="grid grid-cols-1 md:grid-cols-2 gap-4 my-6">
  <div class="rounded-lg bg-emerald-900/20 border border-emerald-400/30 p-4">
    <h4 class="text-emerald-400 font-semibold mb-2">🎯 What Makes Agents Special</h4>
    <ul class="text-zinc-300 space-y-1 text-sm">
      <li>They can actually DO things, not just talk</li>
      <li>They use real-time reasoning and feedback loops</li>
      <li>They're just programs that coordinate AI with tools</li>
    </ul>
  </div>
  <div class="rounded-lg bg-emerald-900/20 border border-emerald-400/30 p-4">
    <h4 class="text-emerald-400 font-semibold mb-2">🚀 Why This Matters</h4>
    <ul class="text-zinc-300 space-y-1 text-sm">
      <li>Agents will become our main AI interface</li>
      <li>The patterns here work for any domain</li>
      <li>Safety and control are built-in from the start</li>
      <li>Real-time streaming makes everything feel natural</li>
    </ul>
  </div>
</div>

## The Future of AI Agents

<InfoBox title="Looking Ahead">
  {#snippet children()}
    <p>As AI models get better, agents like Gemini CLI show us the path forward: <strong>AI that can think, act, and learn in real-time</strong> while keeping humans in control. The magic isn't in the AI model itself—it's in how we connect AI reasoning to real-world actions.</p>
  {/snippet}
</InfoBox>

The patterns from Gemini CLI—streaming responses, safety controls, extensible tools, and transparent reasoning—are the blueprint for the next generation of AI interfaces. We're moving from "AI that talks" to "AI that works."

---

_This post was written with assistance from [Gemini CLI](https://github.com/google-gemini/gemini-cli) and [Claude Code](https://github.com/anthropics/claude-code) (mainly Claude) for research tasks on the Gemini CLI Codebase and helping with blog writing + styling_