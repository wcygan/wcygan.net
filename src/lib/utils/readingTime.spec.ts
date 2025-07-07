import { describe, it, expect } from 'vitest';
import { calculateReadingTime, formatReadingTime } from './readingTime';

describe('calculateReadingTime', () => {
	it('should calculate reading time for short text', () => {
		const shortText = 'This is a short text with only a few words.';
		const minutes = calculateReadingTime(shortText);
		expect(minutes).toBe(1);
	});

	it('should calculate reading time for medium text', () => {
		// Generate text with ~500 words (2-3 min read)
		const words = Array(500).fill('word').join(' ');
		const minutes = calculateReadingTime(words);
		expect(minutes).toBe(3);
	});

	it('should calculate reading time for long text', () => {
		// Generate text with ~1000 words (5 min read)
		const words = Array(1000).fill('word').join(' ');
		const minutes = calculateReadingTime(words);
		expect(minutes).toBe(5);
	});

	it('should handle empty text', () => {
		const minutes = calculateReadingTime('');
		expect(minutes).toBe(0);
	});

	it('should handle text with only whitespace', () => {
		const minutes = calculateReadingTime('   \n\t   ');
		expect(minutes).toBe(0);
	});

	it('should handle text with special characters', () => {
		const text = "Hello! How are you? I'm fine, thanks. #hashtag @mention";
		const minutes = calculateReadingTime(text);
		expect(minutes).toBe(1);
	});

	it('should handle very long text efficiently', () => {
		// Generate text with 10,000 words (50 min read)
		const words = Array(10000).fill('word').join(' ');
		const minutes = calculateReadingTime(words);
		expect(minutes).toBe(50);
	});

	it('should round up partial minutes', () => {
		// ~250 words should be rounded up to 2 min
		const words = Array(250).fill('word').join(' ');
		const minutes = calculateReadingTime(words);
		expect(minutes).toBe(2);
	});
});

describe('formatReadingTime', () => {
	it('should format less than 1 minute', () => {
		expect(formatReadingTime(0)).toBe('< 1 min read');
	});

	it('should format exactly 1 minute', () => {
		expect(formatReadingTime(1)).toBe('1 min read');
	});

	it('should format multiple minutes', () => {
		expect(formatReadingTime(5)).toBe('5 min read');
		expect(formatReadingTime(15)).toBe('15 min read');
		expect(formatReadingTime(30)).toBe('30 min read');
	});
});
