var
  TIDocuments = require('../lib/tidocuments').TIDocuments,
  assert = require('assert'),
  util = require('util');

var s = new TIDocuments('http://www.gopubmed.com/web/bioasq/pmc/json');

s.find('diabetes', 0, 10, function (err, res) {
  console.log(res);
  assert.ifError(err);
  process.exit(0);
});
