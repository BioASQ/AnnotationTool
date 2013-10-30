var step = require('step'),
    TIService = require('./tiservice').TIService;

var TITriples = exports.TITriples = function (URL) {
    TIService.call(this, URL);
};

/*
 * Inherit from TIService
 */
TITriples.prototype = Object.create(TIService.prototype);

/*
 * Override find from base service
 */
TITriples.prototype.find = function (/* String */ keywords, page, itemsPerPage, cb) {
    var self = this;
    this._tokenURL(function (err, URL) {
        if (err) { return cb(err); }

        self._requestJSON(
            URL,
            { 'method': 'POST' }, { 'findStatementsPaged': [ keywords, page, itemsPerPage ] },
            function (err, response) {
                if (err) { return cb(err); }
                cb(null, response.result.statements.map(function (s) {
                        s.title = [ s.subjPhrase, s.predPhrase, s.objPhrase ].join(' ');
                        delete s.subjPhrase;
                        delete s.predPhrase;
                        delete s.objPhrase;

                        s.triples = s.triples.map(function (t) {
                            t.s = t.subj;
                            t.p = t.pred;
                            t.o = t.obj;
                            delete t.subj;
                            delete t.pred;
                            delete t.obj;
                            return t;
                        });

                        return s;
                    }));
            }
        );
    });
};
