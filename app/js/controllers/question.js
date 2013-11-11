angular.module('bioasq-at.controllers.question', ['bioasq-at.services.question'])
.controller('QuestionCtrl', function ($scope, $http, $location, Questions) {
    $scope.allRoutes = $scope.routes;
    $scope.$watch('question', function () {
        if (!$scope.question || $scope.editing) {
            $scope.routes = $scope.allRoutes.slice(0, 1);
        } else {
            $scope.routes = $scope.allRoutes;
        }
    });

    if (!$scope.questions) {
        $http.get('/backend/questions').then(function (result) {
            $scope.questions = result.data.questions;
        });
    }

    $scope.question = Questions.selectedQuestion();

    $scope.editQuestion = function (question) {
        if (question.finalized) {
            if (!confirm('Question is finalized. Do you want to unfinalize it?')) {
                return;
            }
            $scope.question.finalized = false;
        }
        $scope.question._body = $scope.question.body;
        $scope.question._type = $scope.question.type;
        $scope.editing  = true;
        $scope.creating = false;
    };

    $scope.selectQuestion = function (question) {
        for (var i = 0; i < $scope.questions.length; i++) {
            if ($scope.questions[i]._id === question._id) {
                $scope.question = $scope.questions[i];
                $scope.editing = false;
                $scope.$emit('questionSelected');
            }
        }
    };

    $scope.newQuestion = function () {
        $scope.questions.push({version: 2, creator: $scope.user.id });
        $scope.editing  = true;
        $scope.creating = true;
        $scope.question = $scope.questions[$scope.questions.length - 1];
    };

    $scope.cancelEditing = function () {
        if ($scope.creating) {
            $scope.questions.pop();
            $scope.question = null;
        } else {
            $scope.question.body = $scope.question._body;
            $scope.question.type = $scope.question._type;
        }
        $scope.editing  = false;
        $scope.creating = false;
    };

    $scope.saveQuestion = function () {
        delete $scope.question._body;
        delete $scope.question._type;
        if ($scope.creating) {
            Questions.create($scope.question, function (result) {
                $scope.question._id = result.id;
            });
        } else {
            Questions.save($scope.question);
        }
        $scope.editing  = false;
        $scope.creating = false;
    };

    $scope.deleteQuestion = function (question) {
        if (confirm('Are you sure you want to delete this question?')) {
            Questions.delete(question);
            for (var i = 0; i < $scope.questions.length; i++) {
                if ($scope.questions[i]._id === question._id) {
                    $scope.questions.splice(i, 1);
                    $scope.question = null;
                    break;
                }
            }
        }
    };

    $scope.isSelected = function (question) {
        return ($scope.question &&
                $scope.question._id ===  question._id);
    };

    $scope.proceed = function () {
        var path = $scope.mode === 'assessment' ? 'answer' : 'search'
                 + '/' + $scope.question._id;
        $location.path(path);
    };
});
