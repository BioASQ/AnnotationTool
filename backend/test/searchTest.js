var
    Search = require('../lib/search').Search,
    assert = require('assert'),
    util = require('util');

var s = new Search();

var searchTerms = [
    'diabetes AND hypertension',
    '"polymerase chain reaction"',
    'genetic markers',
    'mitofusin 2 receptor parkin'
];

s.find(searchTerms[3], function (err, res) {
    console.log(res);
    assert.ifError(err);
    process.exit(0);
});
