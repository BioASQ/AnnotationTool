angular.module('bioasq-at.controllers.search', ['bioasq-at.services.search'])
.controller('SearchCtrl', function ($scope, Questions, Search) {
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

    $scope.question = Questions.selectedQuestion();
    if (!$scope.question) { $scope.question = {}; }
    Questions.select({});

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

    function fetchConceptsIfNeeded(terms, page, itemsPerPage) {
        if (!$scope.concepts) {
            var sources = _.filter(_.keys(conceptSources), function (source) {
                return ($scope.pages.conceptSources[source] === true);
            });
            Search.concepts(terms, sources, false, page, itemsPerPage)
            .then(function (response) {
                $scope.pages.concepts.total = response.size;
                $scope.pages.concepts.all   = response.total;
                $scope.concepts = response.results.concepts;
                $scope.sources = response.sources;
            });
        }
    }

    function fetchDocumentsIfNeeded(terms, page, itemsPerPage) {
        if (!$scope.documents) {
            Search.documents(terms, page, itemsPerPage)
            .then(function (response) {
                $scope.pages.documents.total = response.size;
                $scope.documents = response.results.documents;
            });
        }
    }

    function fetchStatementsIfNeeded(terms, page, itemsPerPage) {
        if (!$scope.statements) {
            Search.statements(terms, page, itemsPerPage)
            .then(function (response) {
                $scope.pages.statements.total = response.size;
                $scope.statements = response.results.statements;
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
});
