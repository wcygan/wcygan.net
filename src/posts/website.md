---
title: Website
date: January 7, 2025
description: Migrating from AWS Amplify and Hugo to Cloudflare Pages and Svelte
tags: [Website, Cloudflare, Migration]
---

I moved my website from AWS Amplify and Hugo to Cloudflare Pages and Svelte:

```diff
- AWS Amplify
- AWS Route53
- Hugo
+ CloudFlare Pages
+ CloudFlare Registrar
+ SvelteKit
```

## Why the Migration?

AWS quadrupled the price of my old `.io` domain name, so I decided it was time
for a change.

## Code blocks

One feature I really liked on other technical blogs was the ability to render
code blocks nicely and easily copy their content to the clipboard. I wanted to
replicate that experience on my own site.

So, I figured that out. I'm using [Shiki](https://shiki.style/):

```rust file="src/main.rs"
fn main() {
    println!("Hello, World!");
}
```

---

_The source code for this website is available on
[GitHub](https://github.com/wcygan/wcygan.github.io)._
