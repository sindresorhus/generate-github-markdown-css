# generate-github-markdown-css

> Generate the CSS for [`github-markdown-css`](https://github.com/sindresorhus/github-markdown-css)

## Get the CSS

See [`github-markdown-css`](https://github.com/sindresorhus/github-markdown-css)

## How

First the GitHub.com CSS is fetched. Then we walk through all rules that could take effect in markdown content, and then do a custom cleanup. A [rendered Markdown](fixture.md) with all possible syntax is fetched from GitHub to check if we've done right.

## API

```js
const githubMarkdownCss = require('generate-github-markdown-css');

(async () => {
	console.log(await githubMarkdownCss());
	//=> '.markdown-body { …'
})();
```

## CLI

```
$ npm install --global generate-github-markdown-css
```

```
$ github-markdown-css --help

  Usage
    $ github-markdown-css > <filename>
```
