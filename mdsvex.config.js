import { defineMDSveXConfig as defineConfig, escapeSvelte } from 'mdsvex';
import { createHighlighter } from 'shiki';
import { addCopyButton } from 'shiki-transformer-copy-button';

const options = {
	// delay time from "copied" state back to normal state
	toggle: 1000
};

const theme = 'catppuccin-frappe';
const highlighter = await createHighlighter({
	themes: [theme],
	langs: [
		'javascript',
		'typescript',
		'json',
		'bash',
		'markdown',
		'svelte',
		'html',
		'css',
		'rust',
		'go',
		'java',
		'python',
		'diff',
		'yaml'
	]
});

const config = defineConfig({
	extensions: ['.md'],
	highlight: {
		highlighter: async (code, lang = 'text') => {
			const html = escapeSvelte(
				highlighter.codeToHtml(code, {
					lang,
					theme,
					transformers: [addCopyButton(options)]
				})
			);
			return `{@html \`${html}\`}`;
		}
	},
	rehypePlugins: [
		() => (tree) => {
			// Add target="_blank" and rel="noopener noreferrer" to all external links
			(function traverse(node) {
				if (
					node.type === 'element' &&
					node.tagName === 'a' &&
					node.properties.href?.startsWith('http')
				) {
					node.properties.target = '_blank';
					node.properties.rel = 'noopener noreferrer';
				}
				if (node.children) {
					node.children.forEach(traverse);
				}
			})(tree);
		}
	]
});

export default config;
