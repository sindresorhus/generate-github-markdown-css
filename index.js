'use strict';
const got = require('got');
const cheerio = require('cheerio');
const uncss = require('uncss');
const pify = require('pify');
const fs = require('fs');

const uncssP = pify(uncss);

const getCSS = () => got('https://github.com').then(response => {
	const ret = [];
	const $ = cheerio.load(response.body);

	$('link[href$=".css"]').each((i, el) => {
		ret.push(el.attribs.href);
	});

	if (ret.length === 0) {
		throw new Error('Could not find GitHub stylesheets');
	}

	return ret;
});

const getRenderedFixture = () => got.post('https://api.github.com/markdown', {
	headers: {'Content-Type': 'application/json', 'User-Agent': 'generate-github-markdown-css'},
	body: JSON.stringify({
		mode: 'gfm', context: 'sindresorhus/generate-github-markdown-css',
		text: fs.readFileSync('./fixture.md').toString()
	})
}).then(response => `<div class="markdown-body">\n${response.body}\n</div>`);

const cleanupCss = str => {
	const css = require('css');

	const style = css.parse(str);
	const mdBodyProps = [];

	style.stylesheet.rules = style.stylesheet.rules.filter(el => {
		if (el.type === 'keyframes' || el.type === 'comment' || el.type === 'font-face') {
			return false;
		}

		if (el.type === 'rule') {
			if (/::-webkit-validation|[:-]placeholder$|^\.integrations-slide-content|^\.prose-diff|@font-face|^button::|^article$|^\.plan-|^\.plans-|^\.repo-config-option|\.site-search|^::-webkit-file-upload-button$|^input::-webkit-outer-spin-button$/.test(el.selectors[0])) {
				return false;
			}

			// Work around GitHub Markdown API inconsistency #10
			if (el.selectors[0] === '.task-list-item-checkbox') {
				el.selectors[0] = '.task-list-item input';
			}

			// Remove `body` from `body, input {}`
			if (el.selectors[0] === 'body' && el.selectors[1] === 'input') {
				el.selectors.shift();
			}

			if (el.selectors.length === 1 && /^(?:html|body)$/.test(el.selectors[0])) {
				// Remove everything from body/html other than these
				el.declarations = el.declarations.filter(x => /^(?:line-height|color)$|text-size-adjust$/.test(x.property));
			}

			el.selectors = el.selectors.map(selector => {
				if (/^(?:body|html)$/.test(selector)) {
					selector = '.markdown-body';
				}

				if (!/\.markdown-body/.test(selector)) {
					selector = `.markdown-body ${selector}`;
				}

				return selector;
			});

			// Collect `.markdown-body` rules
			if (el.selectors.length === 1 && el.selectors[0] === '.markdown-body') {
				[].push.apply(mdBodyProps, el.declarations);
				return false;
			}
		}

		return el.declarations && el.declarations.length !== 0;
	});

	// Merge `.markdown-body` rules
	style.stylesheet.rules.unshift({
		type: 'rule',
		selectors: ['.markdown-body'],
		declarations: mdBodyProps
	});

	return css.stringify(style);
};

module.exports = () =>
	Promise.all([
		getRenderedFixture(),
		getCSS()
	])
	.then(x => uncssP(x[0], {stylesheets: x[1], ignore: [/^\.pl/]}))
	.then(cleanupCss);
