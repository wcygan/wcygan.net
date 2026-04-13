import { Link } from '@tanstack/react-router'
import type { Post } from '~/lib/types'

interface Props {
  post: Post
}

export function PostCard({ post }: Props) {
  return (
    <li className="post-item">
      <div className="post-title">
        <Link to="/$slug" params={{ slug: post.slug }}>
          {post.title}
        </Link>
      </div>
      <div className="post-date">{post.date}</div>
    </li>
  )
}
