var
  step = require('step'),
  config = require(require('path').join(__dirname, '..', 'config')).defaults,
  TIConcepts = require('./ticoncepts').TIConcepts;

var Search = exports.Search = function () {
  this.doid = new TIConcepts(config.search.concepts.doid);
  this.go = new TIConcepts(config.search.concepts.go);
  this.jochem = new TIConcepts(config.search.concepts.jochem);
  this.mesh = new TIConcepts(config.search.concepts.mesh);
  this.uniprot = new TIConcepts(config.search.concepts.uniprot);
};

Search.prototype._merge = function (sectionName/* variadic arguments */) {
  var mergedResult = [];
  for (var i = 1; i < arguments.length; i++) {
    for (var j = 0; j < arguments[i][sectionName].length; ++j) {
      var current = arguments[i][sectionName][j];
      if ('concept' in current) {
        mergedResult.push({ 'title': current.concept.label, 'uri': current.concept.uri });
      }
    }
  }
  return mergedResult;
};

Search.prototype.find = function (/* String */ keywords, cb) {
  var self = this;
  step(
    function () {
      self.doid.find(keywords, this.parallel()),
      self.go.find(keywords, this.parallel()),
      self.jochem.find(keywords, this.parallel()),
      self.mesh.find(keywords, this.parallel()),
      self.uniprot.find(keywords, this.parallel())
    },
    function (err, doidRes, goRes, jochemRes, meshRes, uniprotRes) {
      if (err) {
        cb(err);
      } else {
        // merge the 'findings' section of each result and return
        cb(null, self._merge('findings', doidRes, goRes, jochemRes, meshRes, uniprotRes));
      }
    }
  );
};
