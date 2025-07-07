import type { Experience } from '$lib/types.js';

export const experiences: Experience[] = [
	{
		id: 'linkedin-sr-swe',
		company: 'LinkedIn',
		title: 'Senior Software Engineer',
		period: 'March 2024 – Present',
		summary:
			"Building next-generation E-Commerce infrastructure to power LinkedIn's Business Platform",
		location: 'Chicago, IL (Remote)',
		technologies: [
			'gRPC',
			'Temporal',
			'Kafka',
			'Beam',
			'Flink',
			'MySQL',
			'Spark',
			'Airflow',
			'Venice',
			'Oracle',
			'Kubernetes',
			'Samza',
			'Trino',
			'HDFS',
			'Kusto'
		]
	},
	{
		id: 'linkedin-swe',
		company: 'LinkedIn',
		title: 'Software Engineer',
		period: 'Feb 2022 – March 2024',
		summary:
			'Growth hacking on high-visibility features (e.g., LinkedIn Feed) for LinkedIn Learning',
		location: 'San Francisco, CA',
		technologies: ['Java', 'Rest.li', 'Kafka', 'Spark', 'HDFS', 'JVM']
	},
	{
		id: 'linkedin-swe-intern-2',
		company: 'LinkedIn',
		title: 'Software Engineer Intern',
		period: 'May 2021 - August 2021',
		location: 'Chicago, IL (Remote)',
		summary: 'Leveraged Economic Graph data to help Job Seekers discover relevant skills',
		technologies: ['Java', 'Rest.li', 'Ember.js']
	},
	{
		id: 'amazon-swe-intern-1',
		company: 'Amazon',
		title: 'Software Engineer Intern',
		period: 'May 2020 – August 2020',
		location: 'Chicago, IL (Remote)',
		summary:
			'Improved the Deployment Pipelines for Machine Learning Models that power Shopping Recommendations on Amazon.com',
		technologies: ['Java', 'Spring Boot']
	},
	{
		id: 'linkedin-swe-intern-1',
		company: 'LinkedIn',
		title: 'Software Engineer Intern',
		period: 'Jan 2020 - March 2020',
		location: 'San Francisco, CA',
		summary: 'Created a new type of CYMBII ("courses you might be interested in") in LinkedIn Feed',
		technologies: ['Java', 'Rest.li']
	},
	{
		id: 'infosys-swe-intern-1',
		company: 'Infosys',
		title: 'Software Engineer Intern',
		period: 'May 2019 – July 2019',
		location: 'Bangalore, India',
		summary:
			'Experimental Computer Vision Projects (e.g., counting open spots in a parking garage)',
		technologies: ['Python', 'OpenCV']
	}
];
