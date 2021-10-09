#!/usr/bin/env node

import meow from 'meow';
import githubMarkdownCss from './index.js';

const cli = meow(`
	Usage
	  github-markdown-css > <filename>

	Options
	  --light     Light theme
	  --dark      Dark theme
	  --list, -l  List available themes

	Examples
	  $ github-markdown-css -l
	  light, dark, dark_dimmed, dark_high_contrast, dark_colorblind, light_colorblind

`, {
	importMeta: import.meta,
	flags: {
		light: {
			type: 'string',
		},
		dark: {
			type: 'string',
		},
		list: {
			type: 'boolean',
			alias: 'l',
		},
	},
});

(async () => {
	console.log(await githubMarkdownCss(cli.flags));
})();
