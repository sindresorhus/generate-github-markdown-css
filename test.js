import fs from 'node:fs';
import {renderMarkdown} from './utilities.js';
import githubMarkdownCss from './index.js';

(async () => {
	fs.mkdirSync('dist', {recursive: true});

	const themes = (await githubMarkdownCss({list: true})).split('\n');

	fs.writeFileSync('dist/all.css', await githubMarkdownCss());

	const promises = [];

	for (const theme of themes) {
		promises.push(new Promise((resolve, reject) => {
			githubMarkdownCss({themes: [theme]})
				.then(css => {
					fs.writeFileSync(`dist/${theme}.css`, css);
					resolve();
				})
				.catch(reject);
		}));
	}

	Promise.all(promises);

	const fixture = await renderMarkdown();
	const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, minimal-ui">
<title>GitHub Markdown CSS demo</title>
<link id="theme" rel="stylesheet" href="all.css">
<body class="markdown-body">
<article class="markdown-body" style="padding: 1em; max-width: 42em; margin: 0px auto;">
${fixture}
</article>
<select style="position: fixed; top: 1em; right: 1em; font-size: 16px;"
				onchange="theme.href=this.value">
	<option value="all.css">all</option>
	${themes.map(theme => `<option value="${theme}.css">${theme}</option>`).join('\n')}
</select>
</body>
</html>
`;
	fs.writeFileSync('dist/index.html', html);
})();
