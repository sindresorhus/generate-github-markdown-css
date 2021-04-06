'use strict';
const fs = require('fs');
const path = require('path');
const got = require('got');
const cheerio = require('cheerio');
const uncss = require('uncss');
const pify = require('pify');

const uncssP = pify(uncss);

const manuallyAddedStyle = `
.markdown-body .octicon {
  display: inline-block;
  fill: currentColor;
  vertical-align: text-bottom;
}

.markdown-body .anchor {
  float: left;
  line-height: 1;
  margin-left: -20px;
  padding-right: 4px;
}

.markdown-body .anchor:focus {
  outline: none;
}

.markdown-body h1 .octicon-link,
.markdown-body h2 .octicon-link,
.markdown-body h3 .octicon-link,
.markdown-body h4 .octicon-link,
.markdown-body h5 .octicon-link,
.markdown-body h6 .octicon-link {
  color: #1b1f23;
  vertical-align: middle;
  visibility: hidden;
}

.markdown-body h1:hover .anchor,
.markdown-body h2:hover .anchor,
.markdown-body h3:hover .anchor,
.markdown-body h4:hover .anchor,
.markdown-body h5:hover .anchor,
.markdown-body h6:hover .anchor {
  text-decoration: none;
}

.markdown-body h1:hover .anchor .octicon-link,
.markdown-body h2:hover .anchor .octicon-link,
.markdown-body h3:hover .anchor .octicon-link,
.markdown-body h4:hover .anchor .octicon-link,
.markdown-body h5:hover .anchor .octicon-link,
.markdown-body h6:hover .anchor .octicon-link {
  visibility: visible;
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
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16' version='1.1' width='16' height='16' aria-hidden='true'%3E%3Cpath fill-rule='evenodd' d='M4 9h1v1H4c-1.5 0-3-1.69-3-3.5S2.55 3 4 3h4c1.45 0 3 1.69 3 3.5 0 1.41-.91 2.72-2 3.25V8.59c.58-.45 1-1.27 1-2.09C10 5.22 8.98 4 8 4H4c-.98 0-2 1.22-2 2.5S3 9 4 9zm9-3h-1v1h1c1 0 2 1.22 2 2.5S13.98 12 13 12H9c-.98 0-2-1.22-2-2.5 0-.83.42-1.64 1-2.09V6.25c-1.09.53-2 1.84-2 3.25C6 11.31 7.55 13 9 13h4c1.45 0 3-1.69 3-3.5S14.5 6 13 6z'%3E%3C/path%3E%3C/svg%3E");
}

`.trim();

const getCSS = async () => {
	const {body} = await got('https://github.com');
	const $ = cheerio.load(body);

	const ret = [];
	$('link[href$=".css"]').each((index, element) => {
		ret.push(element.attribs.href);
	});

	if (ret.length === 0) {
		throw new Error('Could not find GitHub stylesheets');
	}

	return ret;
};

const getRenderedFixture = async () => {
	const {body} = await got.post('https://api.github.com/markdown', {
		headers: {
			'content-type': 'application/json',
			'user-agent': 'generate-github-markdown-css'
		},
		body: JSON.stringify({
			mode: 'gfm',
			context: 'sindresorhus/generate-github-markdown-css',
			text: fs.readFileSync(path.join(__dirname, 'fixture.md'), 'utf8')
		})
	});

	return `<div class="markdown-body">\n${body}\n</div>`;
};

const cleanupCss = str => {
	const css = require('css');

	const style = css.parse(str);
	const markdownBodyProperties = [];

	style.stylesheet.rules = style.stylesheet.rules.filter(element => {
		if (element.type === 'keyframes' || element.type === 'comment' || element.type === 'font-face') {
			return false;
		}

		if (element.type === 'rule') {
			if (/::-webkit-validation|[:-]placeholder$|^\.placeholder-box$|^\.integrations-slide-content|^\.prose-diff|@font-face|^button::|^article$|^\.plan-|^\.plans-|^\.repo-config-option|\.site-search|^::-webkit-file-upload-button$|^input::-webkit-outer-spin-button$|^\.select-menu-item|^\.hx_SelectMenu-item--input|\.HeaderMenu|\.emoji-picker|\.AvatarStack|\.hx_avatar|:focus\+|::-webkit-calendar|:checked\+\.radio-label-theme-discs|:checked\+\.hx_theme-toggle/.test(element.selectors[0])) {
				return false;
			}

			// Remove unused color variables
			element.declarations = element.declarations.filter(x => !/^--color-(?:scale|auto|btn|alert|autocomplete|blankslate|dropdown|input|avatar|toast|timeline|select|box|branch|menu|sidenav|header|filter|drag|upload|previewable|underlinenav|verified|social|tooltip|header|diffstat|mktg|files|hl|logo|discussion|actions|repo|code|global|calendar|footer|pr|topic|merge|project|checks|intro|marketing|workflow|discussions|bg-discussions|upvote|downvote|search|notifications|current-user|gist|profile|shadow|state|label|counter|fade)-/.test(x.property));

			// Work around GitHub Markdown API inconsistency #10
			if (element.selectors[0] === '.task-list-item-checkbox') {
				element.selectors[0] = '.task-list-item input';
			}

			// Remove `body` from `body, input {}`
			if (element.selectors[0] === 'body' && element.selectors[1] === 'input') {
				element.selectors.shift();
			}

			if (element.selectors.length === 1 && /^(?:html|body)$/.test(element.selectors[0])) {
				// Remove everything from body/html other than these
				element.declarations = element.declarations.filter(x => /^(?:line-height|color)$|text-size-adjust$/.test(x.property));
			}

			element.selectors = element.selectors.map(selector => {
				if (/^(?:body|html)$/.test(selector)) {
					selector = '.markdown-body';
				}

				if (!/\.markdown-body/.test(selector)) {
					selector = `.markdown-body ${selector}`;
				}

				return selector;
			});

			// Collect `.markdown-body` rules
			if (element.selectors.length === 1 && element.selectors[0] === '.markdown-body') {
				[].push.apply(markdownBodyProperties, element.declarations);
				return false;
			}
		}

		return element.declarations && element.declarations.length !== 0;
	});

	// Merge `.markdown-body` rules
	style.stylesheet.rules.unshift({
		type: 'rule',
		selectors: ['.markdown-body'],
		declarations: markdownBodyProperties
	});

	return css.stringify(style);
};

module.exports = async () => {
	const [fixture, cssString] = await Promise.all([
		getRenderedFixture(),
		getCSS()
	]);

	const css = await uncssP(fixture, {
		stylesheets: cssString,
		ignore: [
			/^\.pl|^\.tab-size/
		]
	});

	return manuallyAddedStyle + cleanupCss(css);
};
