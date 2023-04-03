#!/usr/bin/env node
import {exit} from 'node:process';
import meow from 'meow';
import githubMarkdownCss from './index.js';

const cli = meow(
	`
  Usage
    github-markdown-css > <filename>

  Options
    --list            List available themes

    Set theme:
      -l, --light           Light theme name from --list values
      -d, --dark            Dark theme name from --list values
      -t, --type, --theme   Theme name: 'auto', light', 'dark', or another from --list values.
                            'auto' means using the media query (prefers-color-scheme)
                            to switch between the 'light' and 'dark' theme.

    Output options:
      --preserveVars        Preserve variables in the output. Only applies if light
                            and dark themes match or if type is not 'auto'
      --onlyStyle           Only output the styles, forces preserveVars on
      --onlyVars            Only output the variables for the specified themes
      --rootSelector        Specify the root selector when outputting styles, default '.markdown-body'

  Examples
    $ github-markdown-css --list
    light
    dark
    dark_dimmed
    dark_high_contrast
    dark_colorblind
    light_colorblind

    $ github-markdown-css --light=light --dark=dark
    [CSS with variable blocks for 'light' and 'dark' themes]

    $ github-markdown-css --theme=dark_dimmed --onlyVars
    [CSS with single variable block for 'dark_dimmed' theme with no element styles]

    $ github-markdown-css --onlyStyles
    [CSS with only element styles using variables but no variables set.
      Use in combination with output from setting --onlyVars]
`,
	{
		importMeta: import.meta,
		flags: {
			theme: {
				alias: ['t', 'type'],
				type: 'string',
			},
			light: {
				alias: 'l',
				type: 'string',
			},
			dark: {
				alias: 'd',
				type: 'string',
			},
			list: {
				type: 'boolean',
			},
			onlyStyle: {
				type: 'boolean',
			},
			onlyVars: {
				type: 'boolean',
			},
			preserveVars: {
				type: 'boolean',
			},
			rootSelector: {
				type: 'string',
			},
		},
	},
);

(async () => {
	const {theme, list, preserveVars, onlyStyle, onlyVars, rootSelector} = cli.flags;
	let {light, dark} = cli.flags;

	/*
	 * | Theme | Light | Dark | Outcome                            |
	 * | ----- | ----- | ---- | ---------------------------------- |
	 * | ✓     |       |      | Single mode, use Theme             |
	 * | ✓     | ✓     |      | Not allowed, can't determine theme |
	 * | ✓     |       | ✓    | Not allowed, can't determine theme |
	 * | ✓     | ✓     | ✓    | Not allowed, can't determine theme |
	 * |       |       |      | Auto, default themes               |
	 * |       | ✓     |      | Single mode, use Light             |
	 * |       |       | ✓    | Single mode, use Dark              |
	 * |       | ✓     | ✓    | Auto, use Light and Dark           |
	 * |       | ✓     | ✓    | Single mode if Light === Dark      |
	 * | auto  |       |      | Auto, default themes               |
	 * | auto  | ✓     |      | Auto, use Light, default dark      |
	 * | auto  |       | ✓    | Auto, use Dark, default light      |
	 * | auto  | ✓     | ✓    | Auto, use Light and Dark           |
	 * | auto  | ✓     | ✓    | Single mode if Light === Dark      |
	 */

	// Use "single" mode when type is a theme name other than 'auto'
	if (theme && theme !== 'auto') {
		if (light || dark) {
			console.error('You may not specify light and/or dark unless type/theme is set to "auto"');
			exit(1);
		}

		light = theme;
		dark = theme;
	}

	// If only light or dark was specified set the other to force "single mode"
	if (!theme && light && !dark) {
		dark = light;
	} else if (!theme && !light && dark) {
		light = dark;
	}

	if (rootSelector === '') {
		console.error('--rootSelector cannot be an empty string');
		exit(1);
	}

	console.log(
		await githubMarkdownCss({
			light,
			dark,
			list,
			preserveVariables: preserveVars,
			onlyStyles: onlyStyle,
			onlyVariables: onlyVars,
			rootSelector,
		}),
	);
})();
