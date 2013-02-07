var
  TIDocuments = require('../lib/tidocuments').TIDocuments,
  assert = require('assert'),
  util = require('util');

var s = new TIDocuments('http://www.gopubmed.org/web/gopubmedbeta/bioasq/pubmed');

s.find('diabetes', 0, 10, function (err, res) {
  res.forEach(function (entry) {
      console.log('- ' + entry.title + ' (' + entry.uri + ')');
  })
  assert.ifError(err);
  process.exit(0);
});
