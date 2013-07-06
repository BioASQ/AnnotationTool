var
    TIDocuments = require('../lib/tidocuments').TIDocuments,
    assert = require('assert'),
    util = require('util');

var s = new TIDocuments('http://www.gopubmed.org/web/gopubmedbeta/bioasq/pubmed');

var queries = [
    'diabetes',
    'hypertension AND proteomics AND diabetes AND genetics AND pcr AND fish',
    '23082254[uid]',
    '23481675[uid]'
];

s.find(queries[3], 0, 10, function (err, res) {
    if (err) { return console.log(err); }
    res.forEach(function (entry) {
        console.log('- ' + entry.title + ' (' + entry.uri + ')');
    });
    assert.ifError(err);
    process.exit(0);
});
