var
  Search = require('../src/search').Search,
  assert = require('assert');

var go = new Search('http://www.gopubmed.org/web/bioasq/go/json');
go.find(function (err) {
}, function (res) {
  assert.ok(res.hasOwnProperty('findings'));
}, 'Foxp2');

go.annotate(function (err) {
}, function (res) {
  assert.ok(res.hasOwnProperty('findings'));
}, 'Foxp2');
