var
  TIService = require('./tiservice').TIService,
  step = require('step');

var Search = exports.Search = function () {
  this.go = new TIService('http://www.gopubmed.org/web/bioasq/go/json');
  this.mesh = new TIService('http://www.gopubmed.org/web/bioasq/mesh/json');
  this.uniprot = new TIService('http://www.gopubmed.org/web/bioasq/uniprot/json');
};

Search.prototype._merge = function (sectionName/* variadic arguments */) {
  var mergedResult = [];
  for (var i = 1; i < arguments.length; i++) {
    mergedResult = mergedResult.concat(arguments[i][sectionName]);
  }
  return mergedResult;
};

Search.prototype.find = function (/* String */ keywords, cb) {
  var self = this;
  step(
    function () {
      self.go.find(keywords, this.parallel()),
      self.mesh.find(keywords, this.parallel()),
      self.uniprot.find(keywords, this.parallel())
    },
    function (err, goRes, meshRes, uniprotRes) {
      if (err) {
        cb(err);
      } else {
        // merge the 'findings' section of each result and return
        cb(null, self._merge('findings', goRes, meshRes, uniprotRes));
      }
    }
  );
};
