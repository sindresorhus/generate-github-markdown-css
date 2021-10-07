import css from 'css';
import {unique, reverseUnique, cachedGot, zip} from './utils.js';

function stringifyRule(rule) {
	const selector = rule.selectors.join(',');
	const body = rule.declarations.map(({property, value}) => `${property}: ${value}`).join(';');
	return `${selector}{${body}}`;
}

function * walkRules(ast) {
	if (ast.type === 'stylesheet') {
		for (const rule of ast.stylesheet.rules) {
			if (rule.type === 'rule') {
				yield rule;
			} else {
				yield * walkRules(rule);
			}
		}
	}
	// ignore @media, etc.
}

function extractColors(colors, name, ast) {
	colors[name] = Object.assign([], {name});
	colors.push(colors[name]);

	for (const rule of walkRules(ast)) {
		for (const declaration of rule.declarations) {
			if (declaration.type === 'declaration') {
				const {property, value} = declaration;
				colors[name][property] = value;
				colors[name].push(declaration);
			}
		}
	}
}

// https://github.com/gjtorikian/html-pipeline/blob/main/lib/html/pipeline/sanitization_filter.rb
const ALLOW_TAGS = `
	h1 h2 h3 h4 h5 h6 h7 h8 br b i strong em a pre code img tt
	div ins del sup sub p ol ul table thead tbody tfoot blockquote
	dl dt dd kbd q samp var hr ruby rt rp li tr td th s strike summary
	details caption figure figcaption
	abbr bdo cite dfn mark small span time wbr
	body html g-emoji
`.trim().split(/\s+/);

const ALLOW_CLASS = `
	.anchor
	.g-emoji
	.highlight
	.octicon
	.octicon-link
`.trim().split(/\s+/);

function select(selector) {
	if (selector.startsWith('.markdown-body')) {
		if (selector.includes('zeroclipboard')) {
			return false;
		}

		return true;
	}

	if (/^[:[\w]/.test(selector)) {
		if (selector === '[hidden][hidden]') {
			return false;
		}

		const tag = selector.match(/^\w[-\w]+/);
		if (tag && !ALLOW_TAGS.includes(tag[0])) {
			return false;
		}

		const klass = selector.match(/\.[-\w]+/);
		if (klass && !ALLOW_CLASS.includes(klass[0])) {
			return false;
		}

		return true;
	}

	return false;
}

function extractStyles(styles, ast) {
	for (const rule of walkRules(ast)) {
		if (rule.declarations.some(({value}) => value.includes('prettylights'))) {
			styles.push(rule);
		} else {
			rule.selectors = rule.selectors.filter(selector => select(selector));
			if (rule.selectors.length > 0) {
				styles.push(rule);
			}
		}
	}
}

async function getCSS() {
	const body = await cachedGot('https://github.com');
	const links = unique(body.match(/(?<=href=").+?\.css/g));
	const contents = await Promise.all(links.map(url => cachedGot(url)));

	const colors = [];
	let rules = [];

	// 1. roughly pick out styles
	for (const [url, cssText] of zip(links, contents)) {
		const [name] = url.match(/(?<=\/)\w+(?=-\w+\.css$)/);
		const ast = css.parse(cssText);

		if (/^(light|dark)/.test(name)) {
			extractColors(colors, name, ast);
		} else {
			extractStyles(rules, ast);
		}
	}

	rules = reverseUnique(rules, stringifyRule);

	// 2. pick out ..theme*=dark -> @media (prefers-color-scheme: dark)

	// TODO

	return css.stringify({type: 'stylesheet', stylesheet: {rules}});
}

export default getCSS;
