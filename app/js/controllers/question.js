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

    $scope.question = Questions.selectedQuestion();
    $http.get('/backend/questions').then(function (result) {
        $scope.questions = result.data.questions;
    });
    $scope.editQuestion = function (question) {
        $scope.question._body = $scope.question.body;
        $scope.question._type = $scope.question.type;
        $scope.editing  = true;
        $scope.creating = false;
    };
    $scope.selectQuestion = function (index) {
        $scope.question = $scope.questions[index];
        Questions.select($scope.question);
    };
    $scope.newQuestion = function () {
        $scope.questions.push({ version: 2 });
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
            Questions.create($scope.question);
        } else {
            Questions.save($scope.question);
        }
        $scope.editing  = false;
        $scope.creating = false;
    };
    $scope.deleteQuestion = function () {
        for (var i = 0; i < $scope.questions.length; i++) {
            if ($scope.questions[i]._id === $scope.question._id) {
                Questions.delete($scope.question);
                $scope.questions.splice(i, 1);
                break;
            }
        }
        $scope.question = null;
    },
    $scope.isSelected = function (index) {
        return ($scope.question &&
                $scope.question._id ===  $scope.questions[index]._id);
    };
    $scope.proceed = function () {
        var path = $scope.mode === 'assessment' ? 'answer' : 'search'
                 + '/' + $scope.question._id;
        $location.path(path);
    };
});
