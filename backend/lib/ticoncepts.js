var
    TIService = require('./tiservice').TIService;

var TIConcepts = exports.TIConcepts = function (URL) {
    TIService.call(this, URL);
};

/*
 * Inherit from TIConcepts
 */
TIConcepts.prototype = Object.create(TIService.prototype);

/*
 * Override find from concepts service
 */
TIConcepts.prototype.find = function (/* String */ keywords, cb) {
    var self = this;
    this._tokenURL(function (err, URL) {
        if (err) { return cb(err); }

        self._requestJSON(
            URL,
            { 'method': 'POST' }, { 'findEntities': [ keywords ] },
            function (err, response) {
                if (err) { return cb(err); }
                cb(null, response.result);
            }
        );
    });
};

TIConcepts.prototype.retrieve = function (ID, cb) {
    var self = this;
    this._tokenURL(function (err, URL) {
        if (err) { return cb(err); }

        self._requestJSON(
            URL,
            { 'method': 'POST' }, { 'retrieveEntities': [ ID ] },
            function (err, response) {
                if (err) { return cb(err); }
                cb(null, response.result);
            }
        );
    });
};
