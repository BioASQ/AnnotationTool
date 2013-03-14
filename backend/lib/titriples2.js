var step = require('step'),
    TIService = require('./tiservice').TIService;

var titleProperties = [
    'http://www.w3.org/2000/01/rdf-schema#label',
    'http://www.w3.org/2004/02/skos/core#prefLabel',
    'http://www.w3.org/2004/02/skos/core#altLabel',
    /*
     * SKOS-XL labels are resources so we don't want them as titles
     * 'http://www.w3.org/2008/05/skos-xl#prefLabel',
     * 'http://www.w3.org/2008/05/skos-xl#altLabel',
     */
    'http://www.w3.org/2008/05/skos-xl#literalForm',
    'http://purl.uniprot.org/core/name',
    'http://www4.wiwiss.fu-berlin.de/diseasome/resource/diseasome/name',
    'http://www4.wiwiss.fu-berlin.de/drugbank/resource/drugbank/name'
];

var labelCache = {};

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
};

TITriples.prototype._dereferenceTitle = function (entity, cb) {
    if (entity.search(/^http:/) === -1) { return cb(null, entity); }

    if (labelCache.hasOwnProperty(entity)) {
        return cb(null, labelCache[entity]);
    }

    var self = this;
    this._tokenURL(function (err, URL) {
        if (err) { return cb(err); }

        self._requestJSON(
            URL,
            { 'method': 'POST' }, { 'findTriples': self._titleQuery(entity) },
            function (err, response) {
                if (err || !response.result.triples.length) {
                    return self._localPart(entity, cb);
                }
                labelCache[entity] = response.result.triples.shift().obj;
                cb(null, labelCache[entity]);
            }
        );
    });
};

TITriples.prototype._topLabel = function (entity, relationDescription, cb) {
    if (labelCache.hasOwnProperty(entity)) {
        return cb(null, labelCache[entity]);
    }

    if (relationDescription.hasOwnProperty('labels') && relationDescription.labels.length) {
        // FIXME: TI service erroneously reuturns URIs as lables so we ignore
        // the returned label if it looks like a URI
        var firstLabel = relationDescription.labels.shift();
        if (firstLabel.search(/^http:/) === -1) {
            labelCache[entity] = firstLabel;
            return cb(null, labelCache[entity]);
        }
    }

    this._localPart(entity, function (err, localPart) {
        if (err) { return cb(err); }

        labelCache[entity] = localPart;
        cb(null, labelCache[entity]);
    });
};

TITriples.prototype._title = function (entityDescription, relationDescription, cb) {
    if (labelCache.hasOwnProperty(entityDescription.entity)) {
        return cb(null, labelCache[entityDescription.entity]);
    }

    // Check all relations for label properties
    for (var i = 0; i < entityDescription.relations.length; i++) {
        var relationDescription = entityDescription.relations[i];
        for (var j = 0; j < titleProperties.length; j++) {
            if (relationDescription.pred === titleProperties[j] && relationDescription.obj) {
                labelCache[entityDescription.entity] = relationDescription.obj;
                return cb(null, labelCache[entityDescription.entity]);
            }
        }
    }

    this._localPart(entityDescription.entity, function (err, localPart) {
        if (err) { return cb(err); }

        labelCache[entityDescription.entity] = localPart;
        cb(null, labelCache[entityDescription.entity]);
    });
};

TITriples.prototype._localPart = function (uri, cb) {
    return cb(null, uri.replace(/^\S+[#/](\S+)$/, '$1'));
};

TITriples.prototype._transform = function (results, page, itemsPerPage, cb) {
    var self          = this,
        numStatements = 0;
    step(
        function () {
            var stGroup = this.group(),
                slGroup = this.group(),
                plGroup = this.group(),
                olGroup = this.group();

            var lower = page * itemsPerPage,
                upper = lower + itemsPerPage;
            results.entities.forEach(function (entityDescription, index) {
                entityDescription.relations.forEach(function (relationDescription, index) {
                    // Only store statements within range into result
                    // and only dereference URIs of statements on current page.
                    // if (numStatements >= lower && numStatements < upper) {
                        if (relationDescription.hasOwnProperty('obj')) {
                            stGroup()(null, {
                                s: entityDescription.entity,
                                p: relationDescription.pred,
                                o: relationDescription.obj
                            });

                           self._title(entityDescription, relationDescription, slGroup());
                           self._localPart(relationDescription.pred, plGroup());
                           self._topLabel(relationDescription.obj, relationDescription, olGroup());
                        } else {
                            stGroup()(null, {
                                s: relationDescription.subj,
                                p: relationDescription.pred,
                                o: entityDescription.entity
                            });

                           self._topLabel(relationDescription.subj, relationDescription, slGroup());
                           self._localPart(relationDescription.pred, plGroup());
                           self._title(entityDescription, relationDescription, olGroup());
                        }
                    // }

                    ++numStatements;
                });
            });
        },
        function (err, statements, subjectLabels, predicateLabels, objectLabels) {
            // let the next step catch the error
            if (err) { throw err; }

            var results = [];
            for (var i = 0; i < statements.length; i++) {
                results.push({
                    s:   statements[i].s,
                    p:   statements[i].p,
                    o:   statements[i].o,
                    s_l: subjectLabels[i],
                    p_l: predicateLabels[i],
                    o_l: objectLabels[i]
                });
            }
            return results;
        },
        function (err, statements) {
            if (err) { return cb(err); }
            cb(null, statements, numStatements);
        }
    );
};

/*
 * Override find from concepts service
 */
TITriples.prototype.find = function (/* String */ keywords, page, itemsPerPage, cb) {
    var self = this;
    this._tokenURL(function (err, URL) {
        if (err) { return cb(err); }

        self._requestJSON(
            URL,
            { 'method': 'POST' }, { 'findEntities': [ keywords ] },
            function (err, response) {
                if (err) { return cb(err); }
                self._transform(response.result, page, itemsPerPage, function (err, statements, size) {
                    if (err) { return cb(err); }
                    cb(null, { size: size, statements: statements });
                });
            }
        );
    });
};

