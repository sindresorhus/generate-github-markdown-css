import css from 'css';
import {unique, cachedGot, renderMarkdown, zip} from './utils.js';

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

function extractStyles(styles, ast) {
	for (const rule of walkRules(ast)) {
		console.log(rule);
	}
}

async function getCSS() {
	const body = await cachedGot('https://github.com');
	const links = unique(body.match(/(?<=href=").+?\.css/g));
	const contents = await Promise.all(links.map(url => cachedGot(url)));

	const colors = [];
	const styles = [];

	for (const [url, cssText] of zip(links, contents)) {
		const [name] = url.match(/(?<=\/)\w+(?=-\w+\.css$)/);
		const ast = css.parse(cssText);

		if (/^(light|dark)/.test(name)) {
			extractColors(colors, name, ast);
		} else {
			extractStyles(styles, ast);
		}
	}
}

export default async function githubMarkdownCss() {
	await Promise.all([
		getCSS(),
		renderMarkdown()
	]);
}
