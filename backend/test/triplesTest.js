var
  TITriples = require('../src/titriples').TITriples,
  assert = require('assert'),
  util = require('util');

var s = new TITriples('http://gopubmed.org/web/bioasq/linkedlifedata/triples');

s.find('foxp2', function (err, res) {
  console.log(res);
  assert.ifError(err);
  process.exit(0);
});
