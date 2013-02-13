var
    Search = require('../lib/search').Search,
    assert = require('assert'),
    util = require('util');

var s = new Search();

s.find('diabetes AND hypertension', function (err, res) {
    console.log(res);
    assert.ifError(err);
    process.exit(0);
});
