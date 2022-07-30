# generate-github-markdown-css

> Generate the CSS for [`github-markdown-css`](https://github.com/sindresorhus/github-markdown-css)

## Get the CSS

See [`github-markdown-css`](https://github.com/sindresorhus/github-markdown-css)

## How

First the GitHub.com CSS is fetched. Then we walk through all rules that could take effect in Markdown content, and then do a custom cleanup. A [rendered Markdown](fixture.md) with all possible syntax is fetched from GitHub to check if we've done right.

## API

```js
import githubMarkdownCss from 'generate-github-markdown-css';

console.log(await githubMarkdownCss({ light: 'light', dark: 'dark' }));
//=> '.markdown-body { …'
```

## CLI

```
$ npm install --global generate-github-markdown-css
```

```
$ github-markdown-css --help

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
```
