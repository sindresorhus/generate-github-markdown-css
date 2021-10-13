import fs from 'node:fs';
import {renderMarkdown} from './utils.js';
import githubMarkdownCss from './index.js';

(async () => {
	fs.mkdirSync('dist', {recursive: true});

	fs.writeFileSync('dist/auto.css', await githubMarkdownCss());
	fs.writeFileSync('dist/light.css', await githubMarkdownCss({dark: 'light'}));
	fs.writeFileSync('dist/dark.css', await githubMarkdownCss({light: 'dark'}));

	const fixture = await renderMarkdown();
	const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, minimal-ui">
<title>GitHub Markdown CSS demo</title>
<link id="theme" rel="stylesheet" href="auto.css">
<body class="markdown-body">
<article class="markdown-body" style="padding: 1em; max-width: 42em; margin: 0px auto;">
${fixture}
</article>
<select style="position: fixed; top: 1em; right: 1em; font-size: 16px;"
				onchange="theme.href=this.value">
	<option value="auto.css">auto</option>
	<option value="light.css">light</option>
	<option value="dark.css">dark</option>
</select>
</body>
</html>
`;
	fs.writeFileSync('dist/index.html', html);
})();
