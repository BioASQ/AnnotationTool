var
  Search = require('../src/ticoncepts').Search,
  assert = require('assert'),
  util = require('util');

var s = new Search();

s.find('foxp1', function (err, res) {
  console.log(res);
  assert.ifError(err);
  process.exit(0);
});
