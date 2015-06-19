#!/usr/bin/env node
'use strict';
var meow = require('meow');
var githubMarkdownCss = require('./');

meow({
	help: [
		'Usage',
		'  github-markdown-css > <filename>'
	]
});

githubMarkdownCss(function (err, css) {
	if (err) {
		throw err;
	}

	console.log(css);
});
