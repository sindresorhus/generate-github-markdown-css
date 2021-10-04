import css from 'css';
import got from 'got';

const id = x => x;

function unique(array, by=id) {
	let seen = new Set(), ret = [];
	for (const a of array) {
		let key = by(a)
		if (!seen.has(key)) {
			seen.add(key);
			ret.push(a);
		}
	}
	return ret;
}

async function getCSS() {
	const {body} = await got('https://github.com');
	const links = unique(body.match(/(?<=href=").+?\.css/g));
	console.log(links);
}

export default async function githubMarkdownCss() {
	await getCSS();
	return '';
}
