var
  Search = require('../src/search').Search,
  assert = require('assert'),
  util = require('util');

var s = new Search();

s.find('Foxp2', function (err, res) {
  assert.ifError(err);
  process.exit(0);
});
