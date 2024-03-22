import fs from 'node:fs';
import {renderMarkdown} from './utilities.js';
import githubMarkdownCss from './index.js';

fs.mkdirSync('dist', {recursive: true});

fs.writeFileSync('dist/auto.css', await githubMarkdownCss());

const themes = [
	'light',
	'light_high_contrast',
	'light_colorblind',
	'light_tritanopia',
	'dark',
	'dark_high_contrast',
	'dark_colorblind',
	'dark_tritanopia',
	'dark_dimmed',
];

await Promise.all(themes.map(async theme => {
	fs.writeFileSync(`dist/${theme}.css`, await githubMarkdownCss({light: theme, dark: theme}));
}));

fs.writeFileSync('dist/auto_colorblind.css', await githubMarkdownCss({light: 'light_colorblind', dark: 'dark_colorblind'}));

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

<div class="markdown-alert markdown-alert-note" dir="auto">
  <p class="markdown-alert-title" dir="auto"><svg class="octicon octicon-info mr-2" viewBox="0 0 16 16" version="1.1" width="16" height="16" aria-hidden="true"><path d="M0 8a8 8 0 1 1 16 0A8 8 0 0 1 0 8Zm8-6.5a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13ZM6.5 7.75A.75.75 0 0 1 7.25 7h1a.75.75 0 0 1 .75.75v2.75h.25a.75.75 0 0 1 0 1.5h-2a.75.75 0 0 1 0-1.5h.25v-2h-.25a.75.75 0 0 1-.75-.75ZM8 6a1 1 0 1 1 0-2 1 1 0 0 1 0 2Z"></path></svg>Note</p>
  <p dir="auto">Highlights information that users should take into account, even when skimming.</p>
</div>

</article>
<select style="position: fixed; top: 1em; right: 1em; font-size: 16px;"
				onchange="theme.href=this.value">
	<option value="auto.css">auto</option>
	<option value="auto_colorblind.css">auto_colorblind</option>
	${themes.map(theme => `<option value="${theme}.css">${theme}</option>`).join('\n')}
</select>
</body>
</html>
`;

fs.writeFileSync('dist/index.html', html);

// Demonstrate theme variable files switching with base css
fs.mkdirSync('dist/vars', {recursive: true});

fs.writeFileSync('dist/vars/base.css', await githubMarkdownCss({onlyStyles: true}));
fs.writeFileSync('dist/vars/auto-vars.css', await githubMarkdownCss({onlyVariables: true}));
fs.writeFileSync('dist/vars/auto_colorblind-vars.css', await githubMarkdownCss({light: 'light_colorblind', dark: 'dark_colorblind', onlyVariables: true}));

await Promise.all(themes.map(async theme => {
	fs.writeFileSync(`dist/vars/${theme}-vars.css`, await githubMarkdownCss({light: theme, dark: theme, onlyVariables: true}));
}));

const htmlVars = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, minimal-ui">
<title>GitHub Markdown CSS demo</title>
<link id="base" rel="stylesheet" href="base.css">
<link id="theme" rel="stylesheet" href="auto-vars.css">
<body class="markdown-body">
<article class="markdown-body" style="padding: 1em; max-width: 42em; margin: 0px auto;">
${fixture}

<div class="markdown-alert markdown-alert-note" dir="auto">
  <p class="markdown-alert-title" dir="auto"><svg class="octicon octicon-info mr-2" viewBox="0 0 16 16" version="1.1" width="16" height="16" aria-hidden="true"><path d="M0 8a8 8 0 1 1 16 0A8 8 0 0 1 0 8Zm8-6.5a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13ZM6.5 7.75A.75.75 0 0 1 7.25 7h1a.75.75 0 0 1 .75.75v2.75h.25a.75.75 0 0 1 0 1.5h-2a.75.75 0 0 1 0-1.5h.25v-2h-.25a.75.75 0 0 1-.75-.75ZM8 6a1 1 0 1 1 0-2 1 1 0 0 1 0 2Z"></path></svg>Note</p>
  <p dir="auto">Highlights information that users should take into account, even when skimming.</p>
</div>

</article>
<select style="position: fixed; top: 1em; right: 1em; font-size: 16px;"
				onchange="theme.href=this.value">
	<option value="auto-vars.css">auto</option>
	<option value="auto_colorblind-vars.css">auto_colorblind</option>
	${themes.map(theme => `<option value="${theme}-vars.css">${theme}</option>`).join('\n')}
</select>
</body>
</html>
`;

fs.writeFileSync('dist/vars/index.html', htmlVars);
