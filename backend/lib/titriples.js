var step = require('step'),
    TIService = require('./tiservice').TIService;

var titleProperties = [
    'http://www.w3.org/2000/01/rdf-schema#label'
];

var TITriples = exports.TITriples = function (URL) {
    TIService.call(this, URL);
};

/*
 * Inherit from TITriples
 */
TITriples.prototype = Object.create(TIService.prototype);

TITriples.prototype._titleQuery = function (s) {
    return titleProperties.map(function (titleProperty) {
        return s + '[subj] AND ' + titleProperty + '[pred]';
    });
}

TITriples.prototype._dereferenceTitle = function (URI, cb) {
    var self = this;
    this._tokenURL(function (err, URL) {
        if (err) { return cb(err); }

        self._requestJSON(
            URL,
            { 'method': 'POST' }, { 'findTriples': self._titleQuery(URI) },
            function (err, response) {
                var title;
                if (err || !response.result.triples.length) {
                    title = URI.replace(/^\S+[#/](\S+)$/, '$1');
                } else {
                    title = response.result.triples.shift().obj;
                }
                cb(null, title);
            }
        )
    });
};

TITriples.prototype._transform = function (results, cb) {
    var self = this;
    step(
        function () {
            var oGroup = this.group();
            var sGroup = this.group();
            var pGroup = this.group();
            for (var i = 0; i < results.triples.length; i++) {
                // fake first group passes through original statement to the next step
                oGroup()(null, results.triples[i]),
                self._dereferenceTitle(results.triples[i].subj, sGroup()),
                self._dereferenceTitle(results.triples[i].pred, pGroup())
            }
        },
        function (err, passThrough, subjectLabels, predicateLabels) {
            // let the next step catch the error
            if (err) { throw err; }

            var statements = [];
            for (var i = 0; i < results.triples.length; i++) {
                statements.push({
                    s:   passThrough[i].subj,
                    p:   passThrough[i].pred,
                    o:   passThrough[i].obj,
                    s_l: subjectLabels[i],
                    p_l: predicateLabels[i]
                });
            }
            return statements;
        },
        function (err, statements) {
            if (err){ return cb(err); }
            cb(null, statements);
        }
    );
};

/*
 * Override find from concepts service
 */
TITriples.prototype.find = function (/* String */ keywords, cb) {
    var self = this;
    this._tokenURL(function (err, URL) {
        if (err) { return cb(err); }

        self._requestJSON(
            URL,
            { 'method': 'POST' }, { 'findTriples': [ keywords ] },
            function (err, response) {
                if (err) { return cb(err); }
                self._transform(response.result, function (err, statements) {
                    if (err) { return cb(err); }
                    cb(null, statements);
                });
            }
        );
    });
};

