const pubMedBaseURI = 'http://www.ncbi.nlm.nih.gov/pubmed/';

var TIService = require('./tiservice').TIService;

var TIDocuments = exports.TIDocuments = function (URL) {
    TIService.call(this, URL);
};

/*
 * Inherit from TIConcepts
 */
TIDocuments.prototype = Object.create(TIService.prototype);

TIDocuments.prototype._transform = function (results) {
    return results.map(function(result) {
        return {
            uri: pubMedBaseURI + result.pmid,
            title: result.title ? result.title : result.documentAbstract.substr(0, 20) + '...',
            sections: result.sections ? result.sections : [ result.documentAbstract ]
        };
    });
};

/*
 * Override find from concepts service
 */
TIDocuments.prototype.find = function (/* String */ keywords, page, itemsPerPage, cb) {
    var self = this;
    this._tokenURL(function (err, URL) {
        if (err) { return cb(err); }

        self._requestJSON(
            URL,
            { 'method': 'POST' }, { 'findPubMedCitations': [ keywords, page, itemsPerPage ] },
            function (err, response) {
                if (err) { return cb(err); }
                cb(null,
                   self._transform(response.result.documents),
                   Math.ceil(response.result.size / itemsPerPage));
            }
        );
    });
};

