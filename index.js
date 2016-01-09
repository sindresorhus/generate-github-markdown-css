'use strict';
var got = require('got');
var cheerio = require('cheerio');
var uncss = require('uncss');

function getCss(cb) {
	got('https://github.com', function (err, data) {
		if (err) {
			cb(err);
			return;
		}

		var ret = [];
		var $ = cheerio.load(data);

		$('link[href*="assets/github"]').each(function (i, el) {
			ret.push(el.attribs.href);
		});

		if (ret.length === 0) {
			cb(new Error('Could not find GitHub stylesheets'));
			return;
		}

		cb(null, ret);
	});
}

function getRenderedFixture(cb) {
	var url = 'https://github.com/sindresorhus/generate-github-markdown-css/blob/master/fixture.md';

	got(url, function (err, data) {
		if (err) {
			cb(err);
			return;
		}

		var $ = cheerio.load(data);
		var html = $('.markdown-body').parent().html();

		cb(null, html);
	});
}

function cleanupCss(str) {
	var css = require('css');
	var style = css.parse(str);
	var mdBodyProps = [];

	style.stylesheet.rules = style.stylesheet.rules.filter(function (el) {
		if (el.type === 'keyframes' || el.type === 'comment' || el.type === 'font-face') {
			return false;
		}

		if (el.type ==='rule') {
			if (/::-webkit-validation|[:\-]placeholder$|^\.integrations-slide-content|^\.prose-diff|@font-face|^button::|^article$|^.plan-choice|^.plan-price|^.plan-notice|\.site-search/.test(el.selectors[0])) {
				return false;
			}

			// work around GitHub Markdown API inconsistency #10
			if (el.selectors[0] === '.task-list-item-checkbox') {
				el.selectors[0] = '.task-list-item input';
			}

			// remove `body` from `body, input {}`
			if (el.selectors[0] === 'body' && el.selectors[1] === 'input') {
				el.selectors.shift();
			}

			if (el.selectors.length === 1 && /^(?:html|body)$/.test(el.selectors[0])) {
				el.declarations = el.declarations.filter(function (declaration) {
					// remove everything from body/html other than these
					if (/^(?:line-height|color)$|text-size-adjust$/.test(declaration.property)) {
						return true;
					}

					return false;
				});
			}

			el.selectors = el.selectors.map(function (selector) {
				if (/^(?:body|html)$/.test(selector)) {
					selector = '.markdown-body';
				}

				if (!/\.markdown-body/.test(selector)) {
					selector = '.markdown-body ' + selector;
				}

				return selector;
			});

			// collect `.markdown-body` rules
			if (el.selectors.length === 1 && el.selectors[0] === '.markdown-body') {
				[].push.apply(mdBodyProps, el.declarations);
				return false;
			}
		}

		if (el.declarations.length === 0) {
			return false;
		}

		return true;
	});

	// merge `.markdown-body` rules
	style.stylesheet.rules.unshift({
		type: 'rule',
		selectors: ['.markdown-body'],
		declarations: mdBodyProps
	});

	var ret = css.stringify(style);

	ret = '@font-face {\n  font-family: octicons;\n  src: url(data:font/woff;charset=utf-8;base64,d09GRgABAAAAAAZwABAAAAAACFQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABEU0lHAAAGaAAAAAgAAAAIAAAAAUdTVUIAAAZcAAAACgAAAAoAAQAAT1MvMgAAAyQAAABJAAAAYFYEU3RjbWFwAAADcAAAAEUAAACAAJThvmN2dCAAAATkAAAABAAAAAQAAAAAZnBnbQAAA7gAAACyAAABCUM+8IhnYXNwAAAGTAAAABAAAAAQABoAI2dseWYAAAFsAAABPAAAAZwcEq9taGVhZAAAAsgAAAA0AAAANgh4a91oaGVhAAADCAAAABoAAAAkCA8DRGhtdHgAAAL8AAAADAAAAAwGAACfbG9jYQAAAsAAAAAIAAAACABiATBtYXhwAAACqAAAABgAAAAgAA8ASm5hbWUAAAToAAABQgAAAlXu73sOcG9zdAAABiwAAAAeAAAAME3QpOBwcmVwAAAEbAAAAHYAAAB/aFGpk3jaTY6xa8JAGMW/O62BDi0tJLYQincXEypYIiGJjSgHniQ6umTsUEyLm5BV6NDBP8Tpts6F0v+k/0an2i+itHDw3v2+9+DBKTzsJNnWJNTgHEy4BgG3EMI9DCEDOGEXzDADU5hBKMIgNPZqoD3SilVaXZCER3/I7AtxEJLtzzuZfI+VVkprxTlXShWKb3TBecG11rwoNlmmn1P2WYcJczl32etSpKnziC7lQyWe1smVPy/Lt7Kc+0vWY/gAgIIEqAN9we0pwKXreiMasxvabDQMM4riO+qxM2ogwDGOZTXxwxDiycQIcoYFBLj5K3EIaSctAq2kTYiw+ymhce7vwM9jSqO8JyVd5RH9gyTt2+J/yUmYlIR0s04n6+7Vm1ozezUeLEaUjhaDSuXHwVRgvLJn1tQ7xiuVv/ocTRF42mNgZGBgYGbwZOBiAAFGJBIMAAizAFoAAABiAGIAznjaY2BkYGAA4in8zwXi+W2+MjCzMIDApSwvXzC97Z4Ig8N/BxYGZgcgl52BCSQKAA3jCV8CAABfAAAAAAQAAEB42mNgZGBg4f3vACQZQABIMjKgAmYAKEgBXgAAeNpjYGY6wTiBgZWBg2kmUxoDA4MPhGZMYzBi1AHygVLYQUCaawqDA4PChxhmh/8ODDEsvAwHgMKMIDnGL0x7gJQCAwMAJd4MFwAAAHjaY2BgYGaA4DAGRgYQkAHyGMF8NgYrIM3JIAGVYYDT+AEjAwuDFpBmA9KMDEwMCh9i/v8H8sH0/4dQc1iAmAkALaUKLgAAAHjaTY9LDsIgEIbtgqHUPpDi3gPoBVyRTmTddOmqTXThEXqrob2gQ1FjwpDvfwCBdmdXC5AVKFu3e5MfNFJ29KTQT48Ob9/lqYwOGZxeUelN2U2R6+cArgtCJpauW7UQBqnFkUsjAY/kOU1cP+DAgvxwn1chZDwUbd6CFimGXwzwF6tPbFIcjEl+vvmM/byA48e6tWrKArm4ZJlCbdsrxksL1AwWn/yBSJKpYbq8AXaaTb8AAHja28jAwOC00ZrBeQNDQOWO//sdBBgYGRiYWYAEELEwMTE4uzo5Zzo5b2BxdnFOcALxNjA6b2ByTswC8jYwg0VlNuoCTWAMqNzMzsoK1rEhNqByEyerg5PMJlYuVueETKcd/89uBpnpvIEVomeHLoMsAAe1Id4AAAAAAAB42oWQT07CQBTGv0JBhagk7HQzKxca2sJCE1hDt4QF+9JOS0nbaaYDCQfwCJ7Au3AHj+LO13FMmm6cl7785vven0kBjHCBhfpYuNa5Ph1c0e2Xu3jEvWG7UdPDLZ4N92nOm+EBXuAbHmIMSRMs+4aUEd4Nd3CHD8NdvOLTsA2GL8M9PODbcL+hD7C1xoaHeLJSEao0FEW14ckxC+TU8TxvsY6X0eLPmRhry2WVioLpkrbp84LLQPGI7c6sOiUzpWIWS5GzlSgUzzLBSikOPFTOXqly7rqx0Z1Q5BAIoZBSFihQYQOOBEdkCOgXTOHA07HAGjGWiIjaPZNW13/+lm6S9FT7rLHFJ6fQbkATOG1j2OFMucKJJsxIVfQORl+9Jyda6Sl1dUYhSCm1dyClfoeDve4qMYdLEbfqHf3O/AdDumsjAAB42mNgYoAAZQYjBmyAGYQZmdhL8zLdDEydARfoAqIAAAABAAMABwAKABMAB///AA8AAQAAAAAAAAAAAAAAAAABAAAAAA==) format(\'woff\');\n}\n\n' + ret;

	return ret;
}

module.exports = function (cb) {
	getRenderedFixture(function (err, html) {
		if (err) {
			cb(err);
			return;
		}

		getCss(function (err, stylesheets) {
			if (err) {
				cb(err);
				return;
			}

			uncss(html, {
				stylesheets: stylesheets,
				ignore: [
					/^\.pl/ // GitHub code block syntax highlighting
				]
			}, function (err, css) {
				if (err) {
					throw err;
				}

				cb(null, cleanupCss(css));
			});
		});
	});
};
