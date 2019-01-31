import test from 'ava';
import generateCss from '.';

test('main', async t => {
	t.regex(await generateCss(), /markdown-body/);
});
