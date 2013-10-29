angular.module('bioasq-at.controllers.answer', [])
.controller('AnswerCtrl', function ($scope, Questions, $routeParams) {
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
            Questions.save($scope.question);
        }
    };

    $scope.setFinalized = function (finalized) {
        $scope.question.finalized = !!finalized;
        Questions.save({ _id: $scope.question._id, finalized: !!finalized });
    };

    $scope.selectDocument = function (documentURI) {
        for (var i = 0; i < $scope.question.answer.documents.length; i++) {
            if ($scope.question.answer.documents[i].uri === documentURI) {
                $scope.selection.document = $scope.question.answer.documents[i];
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
        for (var i = 0; i < $scope.question.answer.snippets.length; i++) {
            if ($scope.question.answer.snippets[i].localID === parseInt(localID, 10)) {
                $scope.question.answer.snippets.splice(i, 1);
                break;
            }
        }
    };

    $scope.deleteConcept = function (idx) {
        $scope.question.answer.concepts.splice(idx, 1);
    };

    $scope.deleteDocument = function (idx) {
        // TODO: ask if document is linked snippets
        $scope.question.answer.documents.splice(idx, 1);
    };

    $scope.deleteStatement = function (idx) {
        $scope.question.answer.statements.splice(idx, 1);
    };
});
