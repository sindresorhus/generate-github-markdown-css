import css from 'css';
import {unique, cachedGot, renderMarkdown} from './utils.js';

async function getCSS() {
	const body = await cachedGot('https://github.com');
	const links = unique(body.match(/(?<=href=").+?\.css/g));
	for await (const cssText of links.map(url => cachedGot(url))) {
		void cssText;
	}

	void css;
}

export default async function githubMarkdownCss() {
	await getCSS();
	await renderMarkdown();
	return '';
}
