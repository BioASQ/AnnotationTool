var
  TIService = require('./tiservice').TIService;

var TITriples = exports.TITriples = function (URL) {
  TIService.call(this, URL);
};

/*
 * Inherit from TITriples
 */
TITriples.prototype = Object.create(TIService.prototype);

/*
 * Override find from concepts service
 */
TITriples.prototype.find = function (/* String */ keywords, cb) {
  var self = this;
  this._tokenURL(function (URL) {
    self._request(URL,{ 'method': 'POST' }, { 'findTriples': [ keywords ]},
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

