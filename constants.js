// https://github.com/gjtorikian/html-pipeline/blob/main/lib/html_pipeline/sanitization_filter.rb
export const ALLOW_TAGS = new Set([
	'h1',
	'h2',
	'h3',
	'h4',
	'h5',
	'h6',
	'br',
	'b',
	'i',
	'strong',
	'em',
	'a',
	'pre',
	'code',
	'img',
	'tt',
	'div',
	'ins',
	'del',
	'sup',
	'sub',
	'p',
	'picture',
	'ol',
	'ul',
	'table',
	'thead',
	'tbody',
	'tfoot',
	'blockquote',
	'dl',
	'dt',
	'dd',
	'kbd',
	'q',
	'samp',
	'var',
	'hr',
	'ruby',
	'rt',
	'rp',
	'li',
	'tr',
	'td',
	'th',
	's',
	'strike',
	'summary',
	'details',
	'caption',
	'figure',
	'figcaption',
	'abbr',
	'bdo',
	'cite',
	'dfn',
	'mark',
	'small',
	'source',
	'span',
	'time',
	'wbr',
	'body',
	'html',
	'g-emoji',
	'input', // [type=checkbox], for task list
]);

export const ALLOW_CLASS = new Set([
	'.anchor',
	'.g-emoji',
	'.highlight',
	'.octicon',
	'.octicon-link',
	'.contains-task-list',
	'.task-list-item',
	'.task-list-item-checkbox',
	// For Markdown alerts.
	'.octicon-info',
	'.octicon-light-bulb',
	'.octicon-report',
	'.octicon-alert',
	'.octicon-stop',
	'.markdown-alert',
	'.markdown-alert-title',
	'.markdown-alert-note',
	'.markdown-alert-tip',
	'.markdown-alert-important',
	'.markdown-alert-warning',
	'.markdown-alert-caution',
	'.mr-2',
]);

const octicon = String.raw`<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16' version='1.1' aria-hidden='true'><path fill-rule='evenodd' d='M7.775 3.275a.75.75 0 001.06 1.06l1.25-1.25a2 2 0 112.83 2.83l-2.5 2.5a2 2 0 01-2.83 0 .75.75 0 00-1.06 1.06 3.5 3.5 0 004.95 0l2.5-2.5a3.5 3.5 0 00-4.95-4.95l-1.25 1.25zm-4.69 9.64a2 2 0 010-2.83l2.5-2.5a2 2 0 012.83 0 .75.75 0 001.06-1.06 3.5 3.5 0 00-4.95 0l-2.5 2.5a3.5 3.5 0 004.95 4.95l1.25-1.25a.75.75 0 00-1.06-1.06l-1.25 1.25a2 2 0 01-2.83 0z'></path></svg>`;

export const manuallyAddedStyle = `
.markdown-body .octicon {
  display: inline-block;
  fill: currentColor;
  vertical-align: text-bottom;
}

.markdown-body h1:hover .anchor .octicon-link:before,
.markdown-body h2:hover .anchor .octicon-link:before,
.markdown-body h3:hover .anchor .octicon-link:before,
.markdown-body h4:hover .anchor .octicon-link:before,
.markdown-body h5:hover .anchor .octicon-link:before,
.markdown-body h6:hover .anchor .octicon-link:before {
  width: 16px;
  height: 16px;
  content: ' ';
  display: inline-block;
  background-color: currentColor;
  -webkit-mask-image: url("data:image/svg+xml,${octicon}");
  mask-image: url("data:image/svg+xml,${octicon}");
}
`;
