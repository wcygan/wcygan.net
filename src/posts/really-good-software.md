---
title: Really Good Software
date: November 1, 2025
description: Programs that I can't live without
tags: [Programming, CLI, Productivity]
---

Software that I really like right now:

# Ghostty

https://github.com/ghostty-org/ghostty

*"Ghostty is a terminal emulator that differentiates itself by being fast, feature-rich, and native. While there are many excellent terminal emulators available, they all force you to choose between speed, features, or native UIs. Ghostty provides all three."*

... It's fast and pretty

I used [iterm2](https://iterm2.com/) and [warp](https://www.warp.dev/) before, and I haven't looked back since

Anything other than the MacOS default terminal is fine, but [Ghostty](https://ghostty.org/) is *mega fine*

# Zed

https://github.com/zed-industries/zed

In my opinion, it feels and looks nicer than [VSCode](https://code.visualstudio.com/). I also don't like to edit in the terminal; I never got into using programs like [Neovim](https://neovim.io/), [Emacs](https://www.gnu.org/software/emacs/), or [Helix](https://helix-editor.com/)

They also made a really nice contribution to the Rust ecosystem with [gpui](https://www.gpui.rs/)!

# Fish

https://github.com/fish-shell/fish-shell

I really like the [tab completion](https://fishshell.com/docs/current/interactive.html#tab-completion) and [syntax highlighting](https://fishshell.com/docs/current/tutorial.html#syntax-highlighting)

Not much else to say, it just feels good

# LazyGit

https://github.com/jesseduffield/lazygit

Before LazyGit, working on stacked PRs was a pain...

```bash
git checkout main
git pull --rebase
git checkout wcygan/branch-one
git merge main
git checkout wcygan/branch-two
git merge wcygan/branch-one
git checkout wcygan/branch-three
git merge wcygan/branch-two
...
```

After LazyGit, the amount of keystrokes that I needed to achieve this went down by ~80%!

# RipGrep

https://github.com/BurntSushi/ripgrep

Search for patterns in files. Really nice for searching through logs.

```bash
→ rg 'rpc'
pnpm-lock.yaml
1468:  '@rollup/rollup-linux-powerpc64le-gnu@4.42.0':
5525:  vscode-jsonrpc@8.2.0:
6382:  '@rollup/rollup-linux-powerpc64le-gnu@4.42.0':
8399:      '@rollup/rollup-linux-powerpc64le-gnu': 4.42.0
8940:  vscode-jsonrpc@8.2.0: {}
8944:      vscode-jsonrpc: 8.2.0
```

# Fzf

https://github.com/junegunn/fzf

I use this to fuzzy-search my `history`. It's similar to doing this:

```bash
history | nl | fzf
```

This makes it really easy to find commands you did in the past

# fd

https://github.com/sharkdp/fd

Find files on your computer

```bash
→ fd json
deno.json
package.json
tsconfig.json
```

# jq

https://github.com/jqlang/jq

Make your json pretty and run commands on it

```bash
→ cat deno.json | jq 'keys'
[
  "imports",
  "tasks"
]

→ cat deno.json | jq '.tasks'
{
  "fix-mermaid": "deno run --allow-read --allow-write scripts/fix-mermaid-formatting.ts"
}
```