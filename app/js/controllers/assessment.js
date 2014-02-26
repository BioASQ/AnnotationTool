angular.module('bioasq-at.controllers.assessment', [])
.controller('AssessmentCtrl', function ($scope, Questions, $routeParams) {
    $scope.question = Questions.selectedQuestion();
    $scope.selection = {};

    function initAnswerIfNeeded () {
        $scope.question.answer = $scope.question.answer || {};
        switch ($scope.question.type) {
            case 'yesno':
                $scope.question.answer.exact = $scope.question.answer.exact || '';
                break;
            case 'factoid':
            /* fallthrough */
            case 'list':
                $scope.question.answer.exact = $scope.question.answer.exact || [];
                break;
            case 'summary':
                break;
        }
    }

    delete $scope.message;

    $scope.dimensions = [{
            name: 'recall',
            label: 'Information recall',
            info: 'All the necessary information is reported.'
        }, {
            name: 'precision',
            label: 'Information precision',
            info: 'No irrelevant information is reported.'
        }, {
            name: 'repetition',
            label: 'Information repetition',
            info: 'The answer does not repeat the same information multiple times.'
        }, {
            name: 'readability',
            label: 'Readability',
            info: 'The answer is easily readable and fluent.'
        }
    ];

    $scope.dimensionValues = [1, 2, 3, 4, 5];

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

    $scope.saveQuestion = function () {
        if ($scope.question) {
            Questions.save($scope.question)
            .success(function (data, status) {
                $scope.message = {
                    type: 'success',
                    text: 'Question successfully saved.'

                }
            })
            .error(function (data, status) {
                if (status === 0) {
                    status = 'server not reachable';
                }
                $scope.message = {
                    type: 'error',
                    text: 'Could not save question (' + status + ')!'
                }
            });
        }
    };

    $scope.setFinalized = function (finalized) {
        $scope.question.finalized = !!finalized;
        if (!!finalized) {
            $scope.saveQuestion();
        } else {
            Questions.setFinalized(!!finalized);
        }
    };

    $scope.selectDocument = function (documentURI) {
        for (var i = 0; i < $scope.question.documents.length; i++) {
            if ($scope.question.documents[i].uri === documentURI) {
                $scope.selection.document = $scope.question.documents[i];
                $scope.selection.documents = true;
                break;
            }
        }
    };

    $scope.canAddEntry = function () {
        initAnswerIfNeeded();
        var lastEntryIsEmpty;
        if (!this.question.answer.exact.length) {
            return true;
        }
        try {
            lastEntryIsEmpty = this.question.answer.exact[this.question.answer.exact.length - 1][0] === '';
        } catch(e) {
            return false;
        }
        return !lastEntryIsEmpty;
    };

    $scope.addEntry = function () {
        if (this.canAddEntry()) {
            this.question.answer.exact.push(['']);
        }
    };

    $scope.canAddSynonym = function (i) {
        initAnswerIfNeeded();
        if (typeof i != 'undefined') {
            if (!$scope.question.answer.exact[i].length) {
                return true;
            }
            return $scope.question.answer.exact[i][$scope.question.answer.exact[i].length - 1] !== '';
        } else {
            if (!$scope.question.answer.exact.length) {
                return true;
            }
            return $scope.question.answer.exact[$scope.question.answer.exact.length - 1] !== '';
        }
    };

    $scope.addSynonym = function (i) {
        if (this.canAddSynonym(i)) {
            if (typeof i != 'undefined') {
                this.question.answer.exact[i].push('');
            } else {
                this.question.answer.exact.push('');
            }
        }
    };

    $scope.deleteSnippet = function (localID) {
        for (var i = 0; i < $scope.question.snippets.length; i++) {
            if ($scope.question.snippets[i]._localID === parseInt(localID, 10)) {
                $scope.question.snippets.splice(i, 1);
                break;
            }
        }
    };

    $scope.deleteConcept = function (idx) {
        $scope.question.concepts.splice(idx, 1);
    };

    $scope.deleteDocument = function (idx) {
        // TODO: ask if document is linked snippets
        if ($scope.question.documents[idx].uri === $scope.selection.document.uri) {
            delete $scope.selection.document;
        }
        $scope.question.documents.splice(idx, 1);
    };

    $scope.deleteStatement = function (idx) {
        $scope.question.statements.splice(idx, 1);
    };
});
