import fs from 'node:fs';
import {renderMarkdown} from './utilities.js';
import githubMarkdownCss from './index.js';

(async () => {
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
})();
