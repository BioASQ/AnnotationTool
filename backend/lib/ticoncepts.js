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
    this._tokenURL(function (URL) {
        self._request(URL,{ 'method': 'POST' }, { 'findEntities': [ keywords ]},
            function (err, response) {
                if (err) {
                    cb(err);
                } else {
                    try {
                        var result = JSON.parse(response).result;
                        cb(null, result);
                    } catch (e) {
                        console.log('Could not parse response: ' + response);
                        cb(e);
                    }
                }
            }
        );
    });
};

