# generate-github-markdown-css [![Build Status](https://travis-ci.org/sindresorhus/generate-github-markdown-css.svg?branch=master)](https://travis-ci.org/sindresorhus/generate-github-markdown-css)

> Generate the CSS for [`github-markdown-css`](https://github.com/sindresorhus/github-markdown-css)


## Get the CSS

See [`github-markdown-css`](https://github.com/sindresorhus/github-markdown-css)


## How

First a [rendered Markdown](fixture.md) with all possible syntax is fetched from GitHub. Then the GitHub.com CSS is fetched and both are run through [UnCSS](https://github.com/giakki/uncss), which extracts only the used styles, and then through a custom cleanup.


## Usage

```js
const githubMarkdownCss = require('generate-github-markdown-css');

githubMarkdownCss((err, css) => {
	console.log(css);
	//=> '.markdown-body { ...'
});
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


## License

MIT © [Sindre Sorhus](http://sindresorhus.com)
