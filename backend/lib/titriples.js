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
                cb(null, { page: response.result.page, statements: response.result.statements });
            }
        );
    });
};
