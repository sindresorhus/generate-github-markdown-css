import test from 'ava';
import m from './';

test(async t => {
	t.regex(await m(), /markdown-body/);
});
