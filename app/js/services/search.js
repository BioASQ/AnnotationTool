angular.module('bioasq-at.services.search', [])
.factory('Search', function ($http, $q, $routeParams) {
    var conceptResponse = null;
    // var kRequestTimeout = 235000;
    var kRequestTimeout = 300000;
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
    function reasonForStatus(status) {
        var reason;
        switch (status) {
        case 0:
            reason = 'server not responding';
            break;
        case 500:
            reason = 'server error';
            break;
        case 502:
            reason = 'search server not responding';
            break;
        }
        return reason;
    }
    return {
        concepts: function (query, sources, groupByLabel, page, pageSize) {
            var deferred = $q.defer();
            if (conceptResponse && conceptResponse.query === query) {
                var index = page * pageSize;
                var filtered = _.filter(conceptResponse.concepts, function (c) {
                    return (sources.indexOf(c.source) > -1);
                });
                if (groupByLabel) {
                    filtered = group(filtered);
                }
                deferred.resolve({
                    concepts: filtered.slice(index, index + pageSize),
                    size: filtered.length,
                    sources: conceptResponse.sources,
                    total: conceptResponse.concepts.length
                });
            } else {
                $http.post('/backend/concepts',
                           { query: query, question: $routeParams.id },
                           { timeout: kRequestTimeout })
                .success(function (data) {
                    conceptResponse = {
                        query: query,
                        concepts: data.concepts,
                        sources: {}
                    };

                    // count results per source and set type
                    angular.forEach(conceptResponse.concepts, function (concept) {
                        concept.type = 'concept';
                        conceptResponse.sources[concept.source] = conceptResponse.sources[concept.source] + 1 || 1;
                    });

                    var filtered = _.filter(conceptResponse.concepts, function (c) {
                        return (sources.indexOf(c.source) > -1);
                    });
                    if (groupByLabel) {
                        filtered = group(filtered);
                    }

                    deferred.resolve({
                        concepts: filtered.slice(0, pageSize),
                        size: filtered.length,
                        sources: conceptResponse.sources,
                        total: conceptResponse.concepts.length
                    });
                })
                .error(function (data, status) {
                    deferred.reject(reasonForStatus(status));
                });
            }
            return deferred.promise;
        },
        documents: function (query, page, pageSize) {
            var deferred = $q.defer();
            $http.post('/backend/documents',
                       { query: query, page: page, itemsPerPage: pageSize, question: $routeParams.id },
                       { timeout: kRequestTimeout })
            .success(function (data) {
                data.documents = data.documents.map(function (d) {
                    d.type = 'document';
                    return d;
                });
                deferred.resolve(data);
            })
            .error(function (data, status) {
            });
            return deferred.promise;
        },
        statements: function (query, page, pageSize) {
            var deferred = $q.defer();
            $http.post('/backend/statements',
                       { query: query, page: page, itemsPerPage: pageSize, question: $routeParams.id },
                       { timeout: kRequestTimeout })
            .success(function (data, status) {
                if (status === 200 && !data.statements) {
                    deferred.reject('bogus response');
                } else {
                    data.statements = _.map(data.statements, function (s) {
                        s.type = 'statement';
                        return s;
                    });
                    deferred.resolve(data);
                }
            })
            .error(function (data, status) {
                deferred.reject(reasonForStatus(status));
            });
            return deferred.promise;
        }
    };
});
