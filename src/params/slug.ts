import type { ParamMatcher } from '@sveltejs/kit';

export const match: ParamMatcher = (param) => {
	// Only match slugs that don't contain file extensions
	return !param.includes('.');
};