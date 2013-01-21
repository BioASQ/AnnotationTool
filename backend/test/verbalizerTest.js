var
  Search = require('../src/search').Search,
  assert = require('assert'),
  util = require('util');

var s = new Search();

s.find('diabetes', function (err, res) {
  console.log(res);
  assert.ifError(err);
  process.exit(0);
});
