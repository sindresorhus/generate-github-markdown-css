import postcss from 'postcss';
import {cachedFetch, getUniqueClasses, renderMarkdown, reverseUnique, unique, zip} from './utilities.js';
import {ALLOW_CLASS, ALLOW_TAGS, manuallyAddedStyle} from './constants.js';

function extractStyles(rules, cssText, {extraAllowableClasses = []} = {}) {
	const allowableClassList = new Set([...ALLOW_CLASS, ...extraAllowableClasses]);

	function select(selector) {
		if (selector.startsWith('.markdown-body')) {
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
			if (klass && !allowableClassList.has(klass[0])) {
				return false;
			}

			return true;
		}

		const klass = selector.match(/^\.[-\w]+/);
		if (klass) {
			return allowableClassList.has(klass[0]);
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
		// 'var(--fgColor-default, var(--color-fg-default))' -> 'var(--fgColor-default)'
		if (declaration.value.includes('Color')) {
			declaration.value = declaration.value.replace(/var\(([^,]+),\s*(var\(--color-.+?\))\)/, 'var($1)');
		}

		// '-webkit-appearance: x' << 'appearance: x'
		if (declaration.prop === '-webkit-appearance') {
			declaration.after(postcss.decl({prop: 'appearance', value: declaration.value}));
		}
	}

	function isRuleUnderAtRule(rule) {
		for (let {parent} = rule; parent; parent = parent.parent) {
			// Keep @layer rules, drop everything else (like '@keyframes')
			if (parent.type === 'atrule' && parent.name !== 'layer') {
				return true;
			}
		}

		return false;
	}

	const root = postcss.parse(cssText);
	root.walkRules(rule => {
		if (isRuleUnderAtRule(rule)) {
			return;
		}

		if (rule.some(node => node.type === 'decl' && node.value.includes('prettylights'))) {
			if (!rule.selector.includes('.QueryBuilder')) {
				rules.push(rule);
			}
		} else {
			rule.selectors = rule.selectors
				.filter(selector => select(selector))
				.map(selector => fixSelector(selector))
				.filter(Boolean);
			if (rule.selector.length > 0) {
				rule.walkDecls(fixDeclaration);
				rules.push(rule);
			}
		}
	});
}

function extractVariables(themes, name, cssText) {
	themes[name] ||= Object.assign([], {name});
	themes.push(themes[name]);

	const theme = themes[name];

	/** @param {postcss.Declaration} declaration */
	function pushOrReplace(declaration) {
		if (declaration.variable) {
			const {prop, value} = declaration;
			if (prop in theme) {
				if (theme[prop] !== value) {
					theme[prop] = value;
					const index = theme.findIndex(decl => decl.prop === prop);
					theme[index] = declaration;
				}
			} else {
				theme[prop] = value;
				theme.push(declaration);
			}
		}
	}

	const root = postcss.parse(cssText);
	root.walkRules(rule => rule.walkDecls(pushOrReplace));
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

	function isEmpty(rule) {
		return !rule.first;
	}

	function mergeRules(rules) {
		const result = [];
		const selectorIndexMap = {};
		for (const rule of rules) {
			if (rule.selector in selectorIndexMap) {
				const existingRule = result[selectorIndexMap[rule.selector]];
				rule.walkDecls(decl => existingRule.append(decl));
			} else {
				const index = result.length;
				selectorIndexMap[rule.selector] = index;
				result.push(rule);
			}
		}

		for (const rule of result) {
			const last = {};
			rule.walkDecls(decl => {
				if (last[decl.prop]) {
					last[decl.prop].remove();
				}

				last[decl.prop] = decl;
				if (decl.prop.startsWith('--')) {
					decl.remove();
				}
			});
		}

		return result.filter(rule => !isEmpty(rule));
	}

	const result = {rules: [], light: [], dark: []};
	for (const rule of rules) {
		const theme = extractTheme(rule);
		if (theme) {
			rule.walkDecls(decl => result[theme].push(decl));
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

function applyColors(colors, rules) {
	for (const rule of rules) {
		rule.walkDecls(decl => {
			if (decl.value.includes('var(')) {
				decl.value = decl.value.replaceAll(/var\((.+?)\)/g, (match, name) => {
					name = name.split(',')[0];
					if (name in colors) {
						return colors[name];
					}

					return match;
				});
			}
		});
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
@param {boolean} [options.useFixture=true] - Include extra styles from GitHub Flavored Markdown, like code snippets.
@param {string} [options.rootSelector=.markdown-body] - Set the root selector of the rendered Markdown body as it should appear in the output CSS. Defaults to `.markdown-body`.
*/
// eslint-disable-next-line complexity
export default async function getCSS({
	light = 'light',
	dark = 'dark',
	list = false,
	preserveVariables = false,
	onlyVariables = false,
	onlyStyles = false,
	useFixture = true,
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

	// Note: Do not use the landing page (https://github.com/) to exclude styles on it
	const body = await cachedFetch('https://github.com/sindresorhus/generate-github-markdown-css');
	// Get a list of all css links on the page
	const links = unique(body.match(/(?<=href=").+?\.css/g));
	const renderMarkdownPromise = useFixture ? renderMarkdown() : Promise.resolve();
	const [fixtureHtml, ...contents] = await Promise.all([
		renderMarkdownPromise,
		...links.map(url => cachedFetch(url)),
	]);
	const fixtureClasses = getUniqueClasses(fixtureHtml);

	let rules = [];
	const colors = [];

	for (const [url, cssText] of zip(links, contents)) {
		// Get the name of a css file without the cache prevention number
		const match = url.match(/(?<=\/)[-\w]+(?=-\w+\.css$)/);
		if (!match) {
			continue;
		}

		const [name] = match;
		const isTheme = /^(light|dark)/.test(name);
		if (list) {
			if (isTheme) {
				colors.push(name);
			}
		} else if (isTheme) {
			// If it's a theme variable file extract colors, otherwise extract style
			extractVariables(colors, name, cssText);
		} else {
			// Primer*.css contains styles and variables that apply to all themes
			if (name.startsWith('primer')) {
				extractVariables(colors, 'shared', cssText);
			}

			extractStyles(rules, cssText, {extraAllowableClasses: fixtureClasses});
		}
	}

	// If asked to list return the list of themes we've discovered
	if (list) {
		return colors.join('\n');
	}

	rules = reverseUnique(rules, rule => rule.toString());

	rules = classifyRules(rules).rules;

	// Find all variables used across all styles
	const usedVariables = new Set();
	for (const rule of rules) {
		rule.walkDecls(({value}) => {
			const re = /var\((?<name>[-\w]+?)[,)]/g;
			let match = null;
			do {
				match = re.exec(value);
				if (match) {
					usedVariables.add(match.groups.name);
				}
			} while (match);
		});
	}

	const colorSchemeLight = postcss.decl({prop: 'color-scheme', value: 'light'});
	const colorSchemeDark = postcss.decl({prop: 'color-scheme', value: 'dark'});

	const filterColors = (from, to = postcss.rule({selectors: ['.markdown-body']})) => {
		for (const decl of from) {
			if (usedVariables.has(decl.prop)) {
				to.append(decl);
			}
		}

		return to;
	};

	if (onlyVariables) {
		rules = [];
	}

	if (!onlyStyles) {
		const hoisted = filterColors(colors.shared);

		if (light === dark) {
			if (preserveVariables) {
				const first = postcss.rule({
					selectors: ['.markdown-body', `[data-theme="${light}"]`],
					nodes: [
						postcss.comment({text: light}),
						light.startsWith('dark') ? colorSchemeDark : colorSchemeLight,
					],
				});

				filterColors(colors[light], first);

				rules.unshift(first);
				rules.unshift(hoisted);
			} else {
				rules = applyColors(colors[light], rules);
				rules = applyColors(colors.shared, rules);

				rules[0].prepend(light.startsWith('dark') ? colorSchemeDark : colorSchemeLight);

				rules.unshift(postcss.comment({text: light}));
			}
		} else {
			const firstLight = postcss.rule({
				selectors: ['.markdown-body', `[data-theme="${light}"]`],
				nodes: [
					postcss.comment({text: light}),
					light.startsWith('dark') ? colorSchemeDark : colorSchemeLight,
				],
			});
			filterColors(colors[light], firstLight);
			rules.unshift(postcss.atRule({
				name: 'media',
				params: '(prefers-color-scheme: light)',
				nodes: [firstLight],
			}));

			const firstDark = postcss.rule({
				selectors: ['.markdown-body', `[data-theme="${dark}"]`],
				nodes: [
					postcss.comment({text: dark}),
					dark.startsWith('light') ? colorSchemeLight : colorSchemeDark,
				],
			});
			filterColors(colors[dark], firstDark);
			rules.unshift(postcss.atRule({
				name: 'media',
				params: '(prefers-color-scheme: dark)',
				nodes: [firstDark],
			}));

			rules.unshift(hoisted);
		}
	}

	for (const rule of rules) {
		rule.cleanRaws();
	}

	for (const rule of rules) {
		if (rule.selector) {
			rule.selector = rule.selectors.join(',\n');
			rule.raws.semicolon = true;
		}
	}

	let string = postcss.root({
		nodes: rules,
		raws: {
			after: '\n',
			indent: '  ',
			semicolon: true,
		},
	}).toString();

	string = string.replaceAll('}\n.markdown-body', '}\n\n.markdown-body');

	if (!onlyVariables) {
		const rootBegin = string.indexOf('\n.markdown-body {');
		const rootEnd = string.indexOf('}', rootBegin) + 2;
		string = string.slice(0, rootEnd) + manuallyAddedStyle + string.slice(rootEnd);
	}

	if (rootSelector !== '.markdown-body') {
		string = string.replaceAll('.markdown-body', rootSelector);
	}

	return string;
}
