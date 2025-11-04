import { error } from '@sveltejs/kit';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ params }) => {
	try {
		const post = await import(`../../posts/${params.slug}.md`);

		return {
			content: post.default,
			meta: post.metadata,
			slug: params.slug
		};
	} catch {
		throw error(404, `Post ${params.slug} not found`);
	}
};
