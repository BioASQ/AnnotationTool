angular.module('bioasq-at.controllers.search', ['bioasq-at.services.search'])
.controller('SearchCtrl', function ($scope, Questions, $routeParams, $http, Search, Cache) {
    var itemsPerPage = 10;
    var pageSettings = {
        concepts:   { total: 0, current: 1 },
        documents:  { total: 0, current: 1 },
        statements: { total: 0, current: 1 },
        size:       itemsPerPage
    };
    var conceptSources = {
        'MeSH':             true,
        'Disease Ontology': false,
        'Gene Ontology':    false,
        'Jochem':           false,
        'UniProt':          false
    };

    if (!$scope.selectedQuestion && $routeParams.id) {
        $scope.question = {};
        Questions.load($routeParams.id).then(function (question) {
            Questions.select(question);
            // trigger change on all question keys
            angular.forEach(question, function (value, key) {
                $scope.question[key] = value;
            });
        });
    }

    if ($routeParams.id) {
        $scope.queries = [];
        $http.get('/backend/questions/history/' + $routeParams.id)
        .success(function (data) {
            $scope.queries = data;
        });
    }

    $scope.$watch('pages.concepts.current', function (newValue, oldValue) {
        if (oldValue && newValue !== oldValue) {
            delete $scope.concepts;
            fetchConceptsIfNeeded($scope.terms, $scope.pages.concepts.current - 1, itemsPerPage);
        }
    });

    $scope.$watch('pages.documents.current', function (newValue, oldValue) {
        if (oldValue && newValue !== oldValue) {
            delete $scope.documents;
            fetchDocumentsIfNeeded($scope.terms, $scope.pages.documents.current - 1, itemsPerPage);
        }
    });

    $scope.termsAreSet = function (item) {
        return !!item.terms;
    };

    function fetchConceptsIfNeeded(terms, page, itemsPerPage) {
        if (!$scope.concepts) {
            delete $scope.pages.concepts.message;
            $scope.conceptsPending = true;
            var sources = _.filter(_.keys(conceptSources), function (source) {
                return ($scope.pages.conceptSources[source] === true);
            });
            Search.concepts(terms, sources, false, page, itemsPerPage)
            .then(function (response) {
                $scope.pages.concepts.total = response.size;
                $scope.pages.concepts.all   = response.total;
                $scope.concepts = response.concepts;
                $scope.sources = response.sources;
                $scope.conceptsPending = false;
            }, function (reason) {
                $scope.pages.concepts.total = 0;
                $scope.pages.concepts.message = 'failed (' + reason + ')';
                $scope.concepts = [];
                $scope.conceptsPending = false;
            });
        }
    }

    function fetchDocumentsIfNeeded(terms, page, itemsPerPage) {
        if (!$scope.documents) {
            delete $scope.pages.documents.message;
            $scope.documentsPending = true;
            Search.documents(terms, page, itemsPerPage)
            .then(function (response) {
                $scope.pages.documents.total = response.size || response.documents.length;
                $scope.documents = response.documents;
                $scope.documentsPending = false;
            }, function (reason) {
                $scope.pages.documents.total = 0;
                $scope.pages.documents.message = 'failed (' + reason + ')';
                $scope.documents = [];
                $scope.documentsPending = false;
            });
        }
    }

    function fetchStatementsIfNeeded(terms, page, itemsPerPage) {
        if (!$scope.statements) {
            delete $scope.pages.statements.message;
            $scope.statementsPending = true;
            Search.statements(terms, page, itemsPerPage)
            .then(function (response) {
                $scope.pages.statements.total = response.size || response.statements.length;
                $scope.statements = response.statements;
                $scope.statementsPending = false;
            }, function (reason) {
                $scope.pages.statements.total = 0;
                $scope.pages.statements.message = 'failed (' + reason + ')';
                $scope.statements = [];
                $scope.statementsPending = false;
            });
        }
    }

    $scope.search = function () {
        $scope.pages                = _.extend({}, pageSettings);
        $scope.pages.conceptSources = _.extend({}, conceptSources);
        $scope.groupByLabel         = true;
        $scope.conceptsShown        = false;
        $scope.documentsShown       = false;
        $scope.statementsShown      = false;

        delete $scope.concepts;
        fetchConceptsIfNeeded($scope.terms, $scope.pages.concepts.current - 1, itemsPerPage);

        delete $scope.documents;
        fetchDocumentsIfNeeded($scope.terms, $scope.pages.documents.current - 1, itemsPerPage);

        delete $scope.statements;
        fetchStatementsIfNeeded($scope.terms, $scope.pages.statements.current - 1, itemsPerPage);

        $http.get('/backend/questions/history/' + $routeParams.id)
        .success(function (data) {
            $scope.queries = data;
        });

        Cache.set('search.lastTerms', $scope.terms);
    };

    $scope.toggleConceptSource = function (source) {
        $scope.pages.conceptSources[source] = !$scope.pages.conceptSources[source];

        var enabledSources = _.filter($scope.pages.conceptSources, function (enabled, source) {
            return (enabled && !!$scope.sources[source]);
        });

        if (enabledSources.length) {
            $scope.pages.concepts.current = 1;
            delete $scope.concepts;
            fetchConceptsIfNeeded($scope.terms, 0, itemsPerPage);
        } else {
            $scope.pages.conceptSources[source] = !$scope.pages.conceptSources[source];
        }
    };

    $scope.setConceptSource = function (name) {
        _.forEach($scope.pages.conceptSources, function (enabled, sourceName) {
            $scope.pages.conceptSources[sourceName] = (sourceName === name);
        });

        $scope.pages.concepts.current = 1;
        delete $scope.concepts;
        fetchConceptsIfNeeded($scope.terms, 0, itemsPerPage);
    };

    $scope.toggleSelection = function (annotation) {
        if (!Questions.hasAnnotation(annotation)) {
            Questions.addAnnotation(annotation);
        } else {
            Questions.removeAnnotation(annotation);
        }
    };

    $scope.select = function (annotation) {
        if (!Questions.hasAnnotation(annotation)) {
            Questions.addAnnotation(annotation);
        }
    };

    $scope.unselect = function (annotation) {
        if (Questions.hasAnnotation(annotation)) {
            Questions.removeAnnotation(annotation);
        }
    };

    $scope.isSelected = function (annotation) {
        return Questions.hasAnnotation(annotation);
    };

    if (Cache.has('search.lastTerms')) {
        $scope.terms = Cache.get('search.lastTerms');
        $scope.search();
    }
});
