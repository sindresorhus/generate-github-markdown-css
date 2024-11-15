import fs from 'node:fs';
import path from 'node:path';

export function zip(a, b) {
	return a.map((element, index) => [element, b[index]]);
}

export function unique(array, by) {
	const seen = new Set();
	const returnValue = [];

	for (const item of array) {
		const key = by ? by(item) : item;
		if (!seen.has(key)) {
			seen.add(key);
			returnValue.push(item);
		}
	}

	return returnValue;
}

export function reverseUnique(array, by) {
	array = [...array].reverse();
	array = unique(array, by);
	return array.reverse();
}

function findCacheDir() {
	const directory = 'node_modules/.cache/generate-github-markdown-css';
	fs.mkdirSync(directory, {recursive: true});
	return (...arguments_) => path.join(directory, ...arguments_);
}

const cachePath = findCacheDir();

const ONE_DAY_IN_MILLISECONDS = 1000 * 60 * 60 * 24;

function isCached(filename, maxAge = ONE_DAY_IN_MILLISECONDS) {
	if (fs.existsSync(filename)) {
		const age = Date.now() - fs.statSync(filename).mtime;
		if (age < maxAge) {
			return true;
		}
	}

	return false;
}

export async function cachedFetch(url) {
	const filename = cachePath(path.basename(url) + '.txt');

	if (isCached(filename)) {
		return fs.readFileSync(filename, 'utf8');
	}

	const response = await fetch(url);
	const body = await response.text();
	if (response.ok) {
		fs.writeFileSync(filename, body);
		return body;
	}

	throw new Error(`Failed to fetch ${url}: ${body}`);
}

export async function renderMarkdown() {
	const filename = cachePath('fixture.md.txt');

	if (isCached(filename, ONE_DAY_IN_MILLISECONDS * 7)) {
		return fs.readFileSync(filename, 'utf8');
	}

	const text = fs.readFileSync(new URL('fixture.md', import.meta.url), 'utf8');

	const response = await fetch('https://api.github.com/markdown', {
		method: 'POST',
		body: JSON.stringify({
			text,
			mode: 'gfm',
			context: 'sindresorhus/generate-github-markdown-css',
		}),
		headers: {
			Accept: 'application/vnd.github.v3+json',
			'User-Agent': 'Node.js',
		},
	});
	const body = await response.text();

	if (response.ok) {
		fs.writeFileSync(filename, body);

		return body;
	}

	throw new Error(`Failed to render markdown: ${body}`);
}

export function getUniqueClasses(html = '') {
	const classNames = [...html.matchAll(/class\s*=\s*["']([^"']+)["']/g)]
		.flatMap(match => match[1].split(/\s+/).map(c => `.${c}`));
	return new Set(classNames);
}
