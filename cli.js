#!/usr/bin/env node
import meow from 'meow';
import githubMarkdownCss from './index.js';

const cli = meow(`
	Usage
	  github-markdown-css > <filename>

	Options
	  --theme, -t     Theme name: 'light', 'dark', 'all' or other --list values.
	              	  The media query (prefers-color-scheme) is available
	              	  to switch between all the differents themes chosen.
	  --list      	  List available themes.
	  --defaultTheme  Omit the media query (prefers-color-scheme) when using a single theme.
	  --help      	  Show help.
	  --version   	  Show version.

	Examples
	  $ github-markdown-css --list
	  light
	  dark
	  dark_dimmed
	  dark_high_contrast
	  dark_colorblind
	  light_colorblind

	  $ github-markdown-css -t light -t dark > example.css
`, {
	importMeta: import.meta,
	flags: {
		theme: {
			type: 'string',
			alias: 't',
			default: ['light'],
			isMultiple: true,
		},
		list: {
			type: 'boolean',
		},
		defaultTheme: {
			type: 'boolean',
		},
	},
});

(async () => {
	const {theme, list, defaultTheme} = cli.flags;

	console.log(await githubMarkdownCss({themes: theme, list, defaultTheme}));
})();
