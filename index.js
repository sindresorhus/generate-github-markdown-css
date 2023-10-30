import css from 'css';
import {unique, reverseUnique, cachedGot, zip} from './utilities.js';

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

	colors[name]['--base-text-weight-normal'] = '400';
	colors[name]['--base-text-weight-semibold'] = '600';
}

// https://github.com/gjtorikian/html-pipeline/blob/main/lib/html/pipeline/sanitization_filter.rb
const ALLOW_TAGS = new Set([
	'h1',
	'h2',
	'h3',
	'h4',
	'h5',
	'h6',
	'h7',
	'h8',
	'br',
	'b',
	'i',
	'strong',
	'em',
	'a',
	'pre',
	'code',
	'img',
	'tt',
	'div',
	'ins',
	'del',
	'sup',
	'sub',
	'p',
	'ol',
	'ul',
	'table',
	'thead',
	'tbody',
	'tfoot',
	'blockquote',
	'dl',
	'dt',
	'dd',
	'kbd',
	'q',
	'samp',
	'var',
	'hr',
	'ruby',
	'rt',
	'rp',
	'li',
	'tr',
	'td',
	'th',
	's',
	'strike',
	'summary',
	'details',
	'caption',
	'figure',
	'figcaption',
	'abbr',
	'bdo',
	'cite',
	'dfn',
	'mark',
	'small',
	'span',
	'time',
	'wbr',
	'body',
	'html',
	'g-emoji',
	'input', // [type=checkbox], for task list
]);

const ALLOW_CLASS = new Set([
	'.anchor',
	'.g-emoji',
	'.highlight',
	'.octicon',
	'.octicon-link',
	'.contains-task-list',
	'.task-list-item',
	'.task-list-item-checkbox',
	// For markdown alerts
	'.markdown-alert',
	'.color-fg-accent',
	'.color-fg-attention',
	'.color-fg-done',
	'.text-semibold',
	'.d-inline-flex',
	'.flex-items-center',
	'.mb-1',
]);

function extractStyles(rules, ast) {
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

			if (selector.includes('[data-') && !selector.includes('[data-color-mode')) {
				return false;
			}

			const tag = selector.match(/^\w[-\w]+/);
			if (tag && !ALLOW_TAGS.has(tag[0])) {
				return false;
			}

			const klass = selector.match(/\.[-\w]+/);
			if (klass && !ALLOW_CLASS.has(klass[0])) {
				return false;
			}

			return true;
		}

		const klass = selector.match(/^\.[-\w]+/);
		if (klass) {
			return ALLOW_CLASS.has(klass[0]);
		}

		return false;
	}

	function fixSelector(selector) {
		if (selector.startsWith('html ') || selector.startsWith('body ')) {
			return selector.slice(5);
		}

		if (selector.startsWith(':root ')) {
			return selector.slice(6);
		}

		return selector;
	}

	function fixDeclaration(declaration) {
		// 'var(--fgColor-default, var(--color-fg-default))' -> 'var(--color-fg-default)'
		if (declaration.value.includes('Color')) {
			declaration.value = declaration.value.replace(/var\([^,]+,\s*(var\(--color-.+?\))\)/, '$1');
		}
	}

	for (const rule of walkRules(ast)) {
		if (rule.declarations.some(({value}) => value.includes('prettylights'))) {
			rules.push(rule);
		} else {
			rule.selectors = rule.selectors
				.filter(selector => select(selector))
				.map(selector => fixSelector(selector));
			if (rule.selectors.length > 0) {
				rule.declarations.map(declaration => fixDeclaration(declaration));
				rules.push(rule);
			}
		}
	}
}

function classifyRules(rules) {
	function extractTheme(rule) {
		for (const selector of rule.selectors) {
			const match = /(?:-theme\*|data-color-mode)=(\w+)/.exec(selector);
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
			result[theme].push(...rule.declarations);
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

const octicon = String.raw`<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16' version='1.1' aria-hidden='true'><path fill-rule='evenodd' d='M7.775 3.275a.75.75 0 001.06 1.06l1.25-1.25a2 2 0 112.83 2.83l-2.5 2.5a2 2 0 01-2.83 0 .75.75 0 00-1.06 1.06 3.5 3.5 0 004.95 0l2.5-2.5a3.5 3.5 0 00-4.95-4.95l-1.25 1.25zm-4.69 9.64a2 2 0 010-2.83l2.5-2.5a2 2 0 012.83 0 .75.75 0 001.06-1.06 3.5 3.5 0 00-4.95 0l-2.5 2.5a3.5 3.5 0 004.95 4.95l1.25-1.25a.75.75 0 00-1.06-1.06l-1.25 1.25a2 2 0 01-2.83 0z'></path></svg>`;

const manuallyAddedStyle = `
.markdown-body .octicon {
  display: inline-block;
  fill: currentColor;
  vertical-align: text-bottom;
}

.markdown-body h1:hover .anchor .octicon-link:before,
.markdown-body h2:hover .anchor .octicon-link:before,
.markdown-body h3:hover .anchor .octicon-link:before,
.markdown-body h4:hover .anchor .octicon-link:before,
.markdown-body h5:hover .anchor .octicon-link:before,
.markdown-body h6:hover .anchor .octicon-link:before {
  width: 16px;
  height: 16px;
  content: ' ';
  display: inline-block;
  background-color: currentColor;
  -webkit-mask-image: url("data:image/svg+xml,${octicon}");
  mask-image: url("data:image/svg+xml,${octicon}");
}
`;

function applyColors(colors, rules) {
	for (const rule of rules) {
		for (const declaration of rule.declarations) {
			const match = /var\((?<name>.+?)\)/.exec(declaration.value);
			if (match) {
				let {name} = match.groups;
				name = name.split(',')[0];
				if (name === '--color-text-primary') {
					name = '--color-fg-default';
				}

				if (name in colors) {
					declaration.value = declaration.value.replace(match[0], colors[name]);
				}
			}
		}
	}

	return rules;
}

/**
Extract markdown styles from github.com

If the `light` and `dark` themes are different, the returned CSS will include `prefers-color-scheme` blocks for light and dark that match the specified `light` and `dark` themes (considered "auto" mode). This mode will always `preserveVariables` as they are necessary for the `prefers-color-scheme` blocks

If the `light` and `dark` themes are equal, the output will only contain one theme (considered "single" mode).

In "single" mode, the output will apply the values of all variables to the rules themselves. The output will not contain any `var(--variable)` statements. You can disable this by setting `preserveVariables` to `true`.

@param {Object} options - Optional options object.
@param {string} [options.light=light] - The theme to use for light theme.
@param {string} [options.dark=dark] - The theme to use for dark theme.
@param {boolean} [options.list=false] - If `true`, will return a list of available themes instead of the CSS.
@param {boolean} [options.preserveVariables=false] - If `true`, will preserve the block of variables for a given theme even if only exporting one theme. By default, variables are applied to the rules themselves and the resulting CSS will not contain any `var(--variable)`.
@param {boolean} [options.onlyVariables=false] - Only output the color variables part of the CSS. Forces `preserveVariables` to be `true`.
@param {boolean} [options.onlyStyles=false] - Only output the style part of the CSS without any variables. Forces `preserveVariables` to be `true` and ignores the theme values. Useful to get the base styles to use multiple themes.
@param {string} [options.rootSelector=.markdown-body] - Set the root selector of the rendered Markdown body as it should appear in the output CSS. Defaults to `.markdown-body`.
*/
export default async function getCSS({
	light = 'light',
	dark = 'dark',
	list = false,
	preserveVariables = false,
	onlyVariables = false,
	onlyStyles = false,
	rootSelector = '.markdown-body',
} = {}) {
	if (onlyVariables && onlyStyles) {
		// Would result in an empty output
		throw new Error('May not specify onlyVariables and onlyStyles at the same time');
	}

	if (rootSelector === '') {
		throw new Error('rootSelector may not be an empty string');
	}

	if (onlyVariables || onlyStyles) {
		preserveVariables = true;
	}

	const body = await cachedGot('https://github.com');
	// Get a list of all css links on the page
	const links = unique(body.match(/(?<=href=").+?\.css/g));
	const contents = await Promise.all(links.map(url => cachedGot(url)));

	const colors = [];
	let rules = [];

	for (const [url, cssText] of zip(links, contents)) {
		// Get the name of a css file without the cache prevention number
		const match = url.match(/(?<=\/)\w+(?=-\w+\.css$)/);
		if (!match) {
			continue;
		}

		const [name] = match;
		const ast = css.parse(cssText);

		// If it's a theme variable file extract colors, otherwise extract style
		if (/^(light|dark)/.test(name)) {
			extractColors(colors, name, ast);
		} else {
			extractStyles(rules, ast);
		}
	}

	// If asked to list return the list of themes we've discovered
	if (list) {
		return colors.map(({name}) => name).join('\n');
	}

	rules = reverseUnique(rules, rule => {
		const selector = rule.selectors.join(',');
		const body = rule.declarations.map(({property, value}) => `${property}: ${value}`).join(';');
		return `${selector}{${body}}`;
	});

	({rules} = classifyRules(rules));

	// Find all variables used across all styles
	const usedVariables = new Set(rules.flatMap(rule => rule.declarations.flatMap(({value}) => {
		let match = /var\((?<name>[-\w]+?)\)/.exec(value)?.groups.name;
		if (match === '--color-text-primary') {
			match = '--color-fg-default';
		}

		return match ? [match] : [];
	})));

	const colorSchemeLight = {type: 'declaration', property: 'color-scheme', value: 'light'};
	const colorSchemeDark = {type: 'declaration', property: 'color-scheme', value: 'dark'};

	const filterColors = (declarations, usedVariables) =>
		declarations.filter(({property}) => usedVariables.has(property));

	if (onlyVariables) {
		rules = [];
	}

	if (!onlyStyles) {
		if (light === dark) {
			if (preserveVariables) {
				rules.unshift({
					type: 'rule',
					selectors: ['.markdown-body', `[data-theme="${light}"]`],
					comment: light,
					declarations: [
						{type: 'comment', comment: light},
						light.startsWith('dark') ? colorSchemeDark : colorSchemeLight,
						...filterColors(colors[light], usedVariables),
					],
				});
			} else {
				rules = applyColors(colors[light], rules);

				if (light.startsWith('dark')) {
					rules[0].declarations.unshift(colorSchemeDark);
				}

				rules.unshift({type: 'comment', comment: light});
			}
		} else {
			rules.unshift({
				type: 'media',
				media: '(prefers-color-scheme: light)',
				rules: [{
					type: 'rule',
					selectors: ['.markdown-body', `[data-theme="${light}"]`],
					declarations: [
						{type: 'comment', comment: light},
						light.startsWith('dark') ? colorSchemeDark : colorSchemeLight,
						...filterColors(colors[light], usedVariables),
					],
				}],
			});

			rules.unshift({
				type: 'media',
				media: '(prefers-color-scheme: dark)',
				rules: [{
					type: 'rule',
					selectors: ['.markdown-body', `[data-theme="${dark}"]`],
					declarations: [
						{type: 'comment', comment: dark},
						dark.startsWith('light') ? colorSchemeLight : colorSchemeDark,
						...filterColors(colors[dark], usedVariables),
					],
				}],
			});
		}
	}

	let string = css.stringify({type: 'stylesheet', stylesheet: {rules}});

	const rootBegin = string.indexOf('\n.markdown-body {');
	const rootEnd = string.indexOf('}', rootBegin) + 2;

	if (!onlyVariables) {
		string = string.slice(0, rootEnd) + manuallyAddedStyle + string.slice(rootEnd);
	}

	if (rootSelector !== '.markdown-body') {
		string = string.replaceAll('.markdown-body', rootSelector);
	}

	return string;
}
