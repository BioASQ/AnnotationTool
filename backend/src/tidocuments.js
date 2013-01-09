const
  pubMedBaseURI = 'http://www.ncbi.nlm.nih.gov/pubmed/';

var
  TIService = require('./tiservice').TIService;

var TIDocuments = exports.TIDocuments = function (URL) {
  TIService.call(this, URL);
};

/*
 * Inherit from TIConcepts
 */
TIDocuments.prototype = Object.create(TIService.prototype);

TIDocuments.prototype._transform = function (results) {
  var results = [];
  return results.map(function(result) {
    return { 'uri': pubMedBaseURI + result.pmid, 'title': result.title };
  });
};

/*
 * Override find from concepts service
 */
TIDocuments.prototype.find = function (/* String */ keywords, page, itemsPerPage, cb) {
  var self = this;
  this._tokenURL(function (URL) {
    self._request(URL, { 'method': 'POST' }, { 'findPubMedCitations': [ keywords, page, itemsPerPage ]},
      function (err, response) {
        if (err) {
          cb(err);
        } else {
          try {
            var result = JSON.parse(response).result.documents;
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

