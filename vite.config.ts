import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import { nitro } from 'nitro/vite'
import mdx from '@mdx-js/rollup'
import remarkFrontmatter from 'remark-frontmatter'
import remarkMdxFrontmatter from 'remark-mdx-frontmatter'
import rehypeShiki from '@shikijs/rehype'

export default defineConfig({
  server: {
    port: 3000,
  },
  css: {
    postcss: './postcss.config.js',
  },
  plugins: [
    mdx({
      remarkPlugins: [remarkFrontmatter, remarkMdxFrontmatter],
      rehypePlugins: [
        [
          rehypeShiki,
          {
            theme: 'github-light',
            langs: [
              'javascript',
              'typescript',
              'json',
              'bash',
              'markdown',
              'html',
              'css',
              'rust',
              'go',
              'java',
              'python',
              'diff',
              'yaml',
            ],
            transformers: [
              {
                name: 'add-line-numbers',
                line(node: any, line: number) {
                  node.properties = node.properties || {}
                  node.properties['data-line'] = line
                },
              },
            ],
          },
        ],
        // Add target="_blank" to external links
        () => (tree: any) => {
          (function traverse(node: any) {
            if (
              node.type === 'element' &&
              node.tagName === 'a' &&
              node.properties?.href?.startsWith('http')
            ) {
              node.properties.target = '_blank'
              node.properties.rel = 'noopener noreferrer'
            }
            if (node.children) {
              node.children.forEach(traverse)
            }
          })(tree)
        },
      ],
    }),
    tanstackStart({
      srcDirectory: 'src',
      prerender: {
        enabled: true,
        crawlLinks: true,
        autoSubfolderIndex: true,
        failOnError: true,
      },
    }),
    react(),
    nitro({ preset: 'bun' }),
  ],
  resolve: {
    alias: [
      { find: '~', replacement: new URL('./src', import.meta.url).pathname },
      { find: /^mermaid$/, replacement: 'mermaid/dist/mermaid.esm.min.mjs' },
    ],
  },
  ssr: {
    noExternal: [],
    external: ['mermaid'],
  },
  build: {
    chunkSizeWarningLimit: 600,
  },
})
