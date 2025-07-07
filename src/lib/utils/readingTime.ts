export function calculateReadingTime(content: string): number {
	const wordsPerMinute = 200;
	const wordCount = content.split(/\s+/).filter((word) => word.length > 0).length;
	return Math.ceil(wordCount / wordsPerMinute);
}

export function formatReadingTime(minutes: number): string {
	if (minutes < 1) return '< 1 min read';
	if (minutes === 1) return '1 min read';
	return `${minutes} min read`;
}
