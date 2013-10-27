var
    step = require('step'),
    config = require(require('path').join(__dirname, '..', '..', 'config')).defaults,
    TIConcepts = require('./ticoncepts').TIConcepts;

var Search = exports.Search = function () {
    this.doid    = new TIConcepts(config.search.concepts.doid);
    this.go      = new TIConcepts(config.search.concepts.go);
    this.jochem  = new TIConcepts(config.search.concepts.jochem);
    this.mesh    = new TIConcepts(config.search.concepts.mesh);
    this.uniprot = new TIConcepts(config.search.concepts.uniprot);
};

var sources = [
    'Disease Ontology',
    'Gene Ontology',
    'Jochem',
    'MeSH',
    'UniProt'
];

Search.prototype._merge = function (sectionName/* variadic arguments */) {
    var mergedResult = [];
    for (var i = 1; i < arguments.length; i++) {
        for (var j = 0; j < arguments[i][sectionName].length; ++j) {
            var current = arguments[i][sectionName][j];
            if ('concept' in current) {
                mergedResult.push({
                    title:  current.concept.label,
                    uri:    current.concept.uri,
                    source: sources[i - 1],
                    score:  current.score,
                    match:  current.matchedLabel
                });
            }
        }
    }

    return mergedResult.sort(function (lhs, rhs) {
        if (lhs.score > rhs.score) { return -1; }
        if (lhs.score < rhs.score) { return 1; }
        return 0;
    });
};

Search.prototype.find = function (/* String */ keywords, cb) {
    var self = this;
    step(
        function () {
            self.doid.find(keywords, this.parallel());
            self.go.find(keywords, this.parallel());
            self.jochem.find(keywords, this.parallel());
            self.mesh.find(keywords, this.parallel());
            self.uniprot.find(keywords, this.parallel());
        },
        function (err/* variadic arguments */) {
            if (err) { return cb(err); }

            // remove `err` argument and turn into proper array
            var args = Array.prototype.slice.call(arguments, 1);
            args.unshift('findings');
            // merge the 'findings' section of each result and return
            cb(null, Search.prototype._merge.apply(self, args));
        }
    );
};
