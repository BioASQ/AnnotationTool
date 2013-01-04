var
  TIService = require('../src/tiservice').TIService,
  assert = require('assert'),
  util = require('util');

var go = new TIService('http://www.gopubmed.org/web/bioasq/go/json');
var s = new Search();

go.find('Foxp2', function (err, res) {
  assert.ok(res.hasOwnProperty('findings'));
});

go.annotate('Foxp2', function (err, res) {
  assert.ok(res.hasOwnProperty('findings'));
});
