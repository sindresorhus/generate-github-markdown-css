#!/usr/bin/env node
import meow from 'meow';
import githubMarkdownCss from './index.js';

const cli = meow(`
	Usage
	  github-markdown-css > <filename>

	Options
	  --type      Theme name: 'light', 'dark', 'auto' or other --list values.
	              'auto' means using the media query (prefers-color-scheme)
	              to switch between the 'light' and 'dark' theme.
	  --list      List available themes.

	Examples
	  $ github-markdown-css --list
	  light
	  dark
	  dark_dimmed
	  dark_high_contrast
	  dark_colorblind
	  light_colorblind
`, {
	importMeta: import.meta,
	flags: {
		type: {
			type: 'string',
		},
		list: {
			type: 'boolean',
		},
	},
});

(async () => {
	const {type, list} = cli.flags;

	let light = type;
	let dark = type;
	if (type === 'auto') {
		light = 'light';
		dark = 'dark';
	}

	console.log(await githubMarkdownCss({light, dark, list}));
})();
