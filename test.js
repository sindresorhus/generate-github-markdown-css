import fs from 'node:fs';
import {renderMarkdown} from './utils.js';
import githubMarkdownCss from './index.js';

(async () => {
	const css = await githubMarkdownCss();
	fs.mkdirSync('dist', {recursive: true});
	fs.writeFileSync('dist/github-markdown.css', css);

	const fixture = await renderMarkdown();
	const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, minimal-ui">
<title>GitHub Markdown CSS demo</title>
<link rel="stylesheet" href="github-markdown.css">
<body class="markdown-body">
<article class="markdown-body" style="padding: 1em; max-width: 42em; margin: 0px auto;">
${fixture}
</article>
</body>
</html>
`;
	fs.writeFileSync('dist/index.html', html);
})();
