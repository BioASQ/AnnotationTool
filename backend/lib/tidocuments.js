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
    return results.filter(function (res) {
        // ignore title-only documents
        return (typeof res.documentAbstract != 'undefined');
    }).map(function(res) {
        var result = {
            uri: pubMedBaseURI + res.pmid,
            title: res.title ? res.title : res.documentAbstract.substr(0, 20) + '...',
            abstract: res.documentAbstract
        };
        //if (typeof res.sections != 'undefined') { result.sections = res.sections; }
        if (typeof res.score != 'undefined') { result.score = res.score; }

        return result;
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
                   response.result.size);
            }
        );
    });
};

