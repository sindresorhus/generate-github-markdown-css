#!/usr/bin/env node

import meow from 'meow';
import githubMarkdownCss from './index.js';

meow(`
	Usage
	  github-markdown-css > <filename>
`, {
	importMeta: import.meta,
});

(async () => {
	console.log(await githubMarkdownCss());
})();
