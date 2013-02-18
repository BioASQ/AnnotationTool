var
    TIDocuments = require('../lib/tidocuments').TIDocuments,
    assert = require('assert'),
    util = require('util');

var s = new TIDocuments('http://www.gopubmed.org/web/gopubmedbeta/bioasq/pubmed');

var queries = [
    'diabetes',
    'hypertension AND proteomics AND diabetes AND genetics AND pcr AND fish'
];

s.find(queries[1], 0, 10, function (err, res) {
    if (err) { return console.log(err); }
    res.forEach(function (entry) {
        console.log('- ' + entry.title + ' (' + entry.uri + ')');
    })
    assert.ifError(err);
    process.exit(0);
});
