var
    TIDocuments = require('../lib/tidocuments').TIDocuments,
    assert = require('assert'),
    util = require('util');

var s = new TIDocuments('http://www.gopubmed.org/web/gopubmedbeta/bioasq/pubmed');

var queries = [
    'amifostine',
    '"hypoxia" AND "amifostine"',
    'diabetes',
    'hypertension AND proteomics AND diabetes AND genetics AND pcr AND fish',
    '23082254[uid]',
    '22836204[uid]',
    '24638193[uid]',
    '23621888[uid]',
    '19151715[uid]',
    'diabetes AND hypertension AND nebivolol',
    'immunogenic histone-like protein',
    'HUR AND functionality',
    '"metabolism" AND ("autoimmunity" OR "autoimmune")[Title]',
    '"metabolism" AND ("autoimmunity" OR "autoimmune"))[Title]',
];

s.find(queries[8], 0, 1000, function (err, res) {
    console.log(res);
    if (err) { return console.log(err); }
    res.forEach(function (entry) {
        var e = JSON.parse(JSON.stringify(entry));
        // delete e.abstract;
        // delete e.sections;
        // console.log(e);
    });
    assert.ifError(err);
    process.exit(0);
});
