import type { Post, PostMetadata } from '~/lib/types'
import { calculateReadingTime } from '~/lib/utils/readingTime'

interface MdxModule {
  frontmatter: PostMetadata
  default: React.ComponentType
}

const postFiles = import.meta.glob<MdxModule>('/src/posts/*.mdx', {
  eager: true,
})

let _posts: Post[] | null = null

function initPosts(): Post[] {
  if (!_posts) {
    _posts = Object.entries(postFiles)
      .map(([filepath, post]) => {
        const slug = filepath.replace('/src/posts/', '').replace('.mdx', '')

        let readingTime = 0
        try {
          const contentMatch = post.default?.toString() || ''
          readingTime = calculateReadingTime(contentMatch)
        } catch {
          readingTime = 1
        }

        return {
          slug,
          title: post.frontmatter.title,
          date: post.frontmatter.date,
          description: post.frontmatter.description,
          tags: post.frontmatter.tags || [],
          readingTime,
        }
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  }
  return _posts
}

export function getAllPosts(): Post[] {
  return initPosts()
}

export function getRecentPosts(count: number): Post[] {
  return initPosts().slice(0, count)
}

export function getPostBySlug(slug: string): Post | undefined {
  return initPosts().find((post) => post.slug === slug)
}

export function getPostsByTag(tag: string): Post[] {
  return initPosts().filter((post) => post.tags && post.tags.includes(tag))
}

export function getAllTags(): string[] {
  const allTags = initPosts()
    .flatMap((post) => post.tags || [])
    .filter((tag, index, array) => array.indexOf(tag) === index)
  return allTags.sort()
}
