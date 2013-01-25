var
  Verbalizer = require('../src/verbalizer').Verbalizer,
  assert = require('assert'),
  util = require('util');

var v = new Verbalizer('http://139.18.2.164:9998/batchverbalizer');

var statements = [
    {s: 'foo', p: 'bar', o: 'baz'}
];

v.verbalize(statements, function (err, res) {
  console.log(res);
  assert.ifError(err);
  process.exit(0);
});

