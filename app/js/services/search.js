angular.module('bioasq-at.services.search', [])
.factory('Search', function ($http, $q) {
    var conceptResponse = null;
    function group(data) {
        var groups = [];
        var newGroup = {
            type: 'concept-group',
            group: true,
            title: null,
            source: null,
            items: []
        };
        var currentGroup = _.extend({}, newGroup);
        _.each(data, function (item) {
            item.type = 'concept';
            item.isChild = true;
            if (item.title === currentGroup.title && item.source === currentGroup.source) {
                currentGroup.items.push(item);
            } else {
                if (currentGroup.items.length) {
                    if (currentGroup.items.length > 1) {
                        groups.push(_.extend({}, currentGroup));
                    } else {
                        groups.push(currentGroup.items[0]);
                    }
                }

                currentGroup = _.extend({}, newGroup);
                currentGroup.title = item.title;
                currentGroup.source = item.source;
                currentGroup.items = [ item ];
            }
        });

        return groups;
    }
    return {
        concepts: function (query, sources, groupByLabel, page, pageSize) {
            var deferred = $q.defer();
            if (conceptResponse && conceptResponse.query === query) {
                var index = page * pageSize;
                var filtered = _.filter(conceptResponse.results.concepts, function (c) {
                    return (sources.indexOf(c.source) > -1);
                });
                if (groupByLabel) {
                    filtered = group(filtered);
                }
                deferred.resolve({
                    results: {
                        concepts: filtered.slice(index, index + pageSize)
                    },
                    size: filtered.length,
                    sources: conceptResponse.sources,
                    total: conceptResponse.results.concepts.length
                });
            } else {
                $http.post('/backend/concepts', { query: query })
                .then(function (response) {
                    conceptResponse = {
                        query: query,
                        results: response.data.results,
                        sources: {}
                    };

                    angular.forEach(response.data.results.concepts, function (concept) {
                        conceptResponse.sources[concept.source] = conceptResponse.sources[concept.source] + 1 || 1;
                    });

                    var filtered = _.filter(conceptResponse.results.concepts, function (c) {
                        return (sources.indexOf(c.source) > -1);
                    });
                    if (groupByLabel) {
                        filtered = group(filtered);
                    }

                    deferred.resolve({
                        results: {
                            concepts: filtered.slice(0, pageSize)
                        },
                        size: filtered.length,
                        sources: conceptResponse.sources,
                        total: conceptResponse.results.concepts.length
                    });
                });
            }
            return deferred.promise;
        },
        documents: function (query, page, pageSize) {
            var deferred = $q.defer();
            $http.post('/backend/documents', { query: query, page: page, itemsPerPage: pageSize })
            .then(function (response) {
                var result = response.data;
                result.results.documents = result.results.documents.map(function (d) {
                    d.type = 'document';
                    return d;
                });
                deferred.resolve(result);
            });
            return deferred.promise;
        },
        statements: function (query, page, pagSize) {
            var deferred = $q.defer();
            deferred.resolve({
                size: 1,
                results: {
                    statements: [
                        { type: 'statement', title: 'Not implemented',
                          s: 'http://example.com/Feature',
                          p: 'http://example.com/not',
                          o: 'implemented' }
                    ]
                }
            });
            /*
             * $http.post('/backend/statements', { query: query })
             * .then(function (response) {
             *     deferred.resolve(response.data);
             * });
             */
            return deferred.promise;
        }
    };
});
