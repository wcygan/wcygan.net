export interface Post {
	title: string;
	date: string;
	description: string;
	slug: string;
	tags?: string[];
	readingTime?: number;
}

export interface PostFile {
	metadata: {
		title: string;
		date: string;
		description: string;
		tags?: string[];
	};
	default: unknown;
}

export interface BlogPost {
	slug: string;
	title: string;
	date: string;
	description: string;
	tags: string[];
	published: boolean;
	content: string;
	readingTime: number;
}

export interface Experience {
	id: string;
	company: string;
	title: string;
	period: string;
	summary: string;
	location?: string;
	technologies?: string[];
	achievements?: string[];
}
