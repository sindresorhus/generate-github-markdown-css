#!/usr/bin/env node
'use strict';
const meow = require('meow');
const githubMarkdownCss = require('./');

meow(`
	Usage
	  github-markdown-css > <filename>
`);

githubMarkdownCss().then(console.log).catch(err => console.log(err.stack));
