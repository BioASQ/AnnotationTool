var
    TIDocuments = require('../lib/tidocuments').TIDocuments,
    assert = require('assert'),
    util = require('util');

var s = new TIDocuments('http://www.gopubmed.org/web/gopubmedbeta/bioasq/pubmed');

var queries = [
    'diabetes',
    'hypertension AND proteomics AND diabetes AND genetics AND pcr AND fish',
    '23082254[uid]',
    '22836204[uid]',
    'diabetes AND hypertension AND nebivolol'
];

s.find(queries[0], 0, 10, function (err, res) {
    if (err) { return console.log(err); }
    res.forEach(function (entry) {
        var e = JSON.parse(JSON.stringify(entry));
        delete e.abstract;
        delete e.sections;
        console.log(e);
    });
    assert.ifError(err);
    process.exit(0);
});
