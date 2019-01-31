'use strict';
const fs = require('fs');
const path = require('path');
const got = require('got');
const cheerio = require('cheerio');
const uncss = require('uncss');
const pify = require('pify');

const uncssP = pify(uncss);

const manuallyAddedStyle = `
font-family: octicons-link;
  src: url(data:font/woff;charset=utf-8;base64,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) format('woff');
}

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
`;

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
	const mdBodyProps = [];

	style.stylesheet.rules = style.stylesheet.rules.filter(el => {
		if (el.type === 'keyframes' || el.type === 'comment' || el.type === 'font-face') {
			return false;
		}

		if (el.type === 'rule') {
			if (/::-webkit-validation|[:-]placeholder$|^\.placeholder-box$|^\.integrations-slide-content|^\.prose-diff|@font-face|^button::|^article$|^\.plan-|^\.plans-|^\.repo-config-option|\.site-search|^::-webkit-file-upload-button$|^input::-webkit-outer-spin-button$/.test(el.selectors[0])) {
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
