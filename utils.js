import fs from 'node:fs';
import path from 'node:path';
import {log} from 'node:console';
import got from 'got';

export function zip(a, b) {
	return a.map((element, i) => [element, b[i]]);
}

export function unique(array, by = null) {
	const seen = new Set();
	const returnValue = [];

	for (const a of array) {
		const key = by ? by(a) : a;
		if (!seen.has(key)) {
			seen.add(key);
			returnValue.push(a);
		}
	}

	return returnValue;
}

export function findCacheDir() {
	const dir = 'node_modules/.cache/generate-github-markdown-css';
	fs.mkdirSync(dir, {recursive: true});
	return (...args) => path.join(dir, ...args);
}

export const cachePath = findCacheDir();

const MaxAge = 86_400 * 1000;

function isCached(filename, maxage = MaxAge) {
	if (fs.existsSync(filename)) {
		const age = Date.now() - fs.statSync(filename).mtime;
		if (age < maxage) {
			return true;
		}
	}

	return false;
}

export async function cachedGot(url) {
	const filename = cachePath(path.basename(url) + '.txt');

	if (isCached(filename)) {
		return fs.readFileSync(filename, 'utf-8');
	}

	log('↓', url);
	const {body} = await got(url);
	fs.writeFileSync(filename, body);

	return body;
}

export async function renderMarkdown() {
	const filename = cachePath('fixture.md.txt');

	if (isCached(filename, MaxAge * 7)) {
		return fs.readFileSync(filename, 'utf-8');
	}

	const text = fs.readFileSync('fixture.md', 'utf-8');
	log('→', 'https://api.github.com/markdown');
	const {body} = await got.post('https://api.github.com/markdown', {
		json: {text},
		headers: {
			Accept: 'application/vnd.github.v3+json',
			'User-Agent': 'Node.js',
		},
	});
	fs.writeFileSync(filename, body);

	return body;
}
