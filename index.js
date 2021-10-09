import css from 'css';
import {unique, reverseUnique, cachedGot, zip} from './utils.js';

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

function extractStyles(styles, ast) {
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

function classifyRules(rules) {
	function extractTheme(rule) {
		for (const selector of rule.selectors) {
			const match = /-theme\*=(\w+)/.exec(selector);
			if (match) {
				return match[1];
			}
		}

		return undefined;
	}

	function mergeRules(rules) {
		const result = [];
		const selectorIndexMap = {};
		for (const rule of rules) {
			const selector = rule.selectors.join(',');
			if (selector in selectorIndexMap) {
				result[selectorIndexMap[selector]].declarations.push(...rule.declarations);
			} else {
				const index = result.length;
				selectorIndexMap[selector] = index;
				result.push(rule);
			}
		}

		for (const rule of result) {
			rule.declarations = reverseUnique(rule.declarations, declaration => declaration.property);

			if (rule.selectors[0] === '.markdown-body') {
				rule.declarations = rule.declarations.filter(declaration => !declaration.property.startsWith('--'));
			}
		}

		return result;
	}

	const result = {rules: [], light: [], dark: []};
	for (const rule of rules) {
		const theme = extractTheme(rule);
		if (theme) {
			result[extractTheme(rule)].push(...rule.declarations);
		} else {
			rule.selectors = rule.selectors.some(s => /^(:root|html|body|\[data-color-mode])$/.test(s))
				? ['.markdown-body']
				: rule.selectors.map(selector =>
					selector.startsWith('.markdown-body') ? selector : '.markdown-body ' + selector,
				);

			result.rules.push(rule);
		}
	}

	result.rules = mergeRules(result.rules);

	return result;
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

	rules = reverseUnique(rules, rule => {
		const selector = rule.selectors.join(',');
		const body = rule.declarations.map(({property, value}) => `${property}: ${value}`).join(';');
		return `${selector}{${body}}`;
	});

	// 2. pick out light/dark declarations
	// let light;
	// let dark;
	({rules} = classifyRules(rules));

	// Light = {
	// 	type: 'media',
	// 	media: '(prefers-color-scheme: light)',
	// 	rules: [{
	// 		type: 'rule',
	// 		selectors: ['.markdown-body'],
	// 		declarations: light,
	// 	}],
	// };

	// dark = {
	// 	type: 'media',
	// 	media: '(prefers-color-scheme: dark)',
	// 	rules: [{
	// 		type: 'rule',
	// 		selectors: ['.markdown-body'],
	// 		declarations: dark,
	// 	}],
	// };

	// rules = [light, dark, ...rules];

	return css.stringify({type: 'stylesheet', stylesheet: {rules}});
}

export default getCSS;
