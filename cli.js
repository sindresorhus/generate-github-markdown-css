#!/usr/bin/env node
'use strict';
const meow = require('meow');
const githubMarkdownCss = require('.');

meow(`
	Usage
	  github-markdown-css > <filename>
`);

(async () => {
	console.log(await githubMarkdownCss());
})();
