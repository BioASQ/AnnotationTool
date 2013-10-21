angular.module('bioasq-at.controllers.question', ['bioasq-at.services.question'])
.controller('QuestionCtrl', function ($scope, $http, $location, Questions) {
    $scope.allRoutes = $scope.routes;
    $scope.$watch('selectedQuestion', function () {
        if (!$scope.selectedQuestion || $scope.editing) {
            $scope.routes = $scope.allRoutes.slice(0, 1);
        } else {
            $scope.routes = $scope.allRoutes;
        }
    });

    $scope.selectedQuestion = Questions.selectedQuestion();
    $http.get('/backend/questions').then(function (result) {
        $scope.questions = result.data.questions;
    });
    $scope.editQuestion = function (question) {
        $scope.selectedQuestion._body = $scope.selectedQuestion.body;
        $scope.selectedQuestion._type = $scope.selectedQuestion.type;
        $scope.editing  = true;
        $scope.creating = false;
    };
    $scope.selectQuestion = function (index) {
        $scope.selectedQuestion = $scope.questions[index];
        Questions.select($scope.selectedQuestion);
    };
    $scope.newQuestion = function () {
        $scope.questions.push({ version: 2 });
        $scope.editing  = true;
        $scope.creating = true;
        $scope.selectedQuestion = $scope.questions[$scope.questions.length - 1];
    };
    $scope.cancelEditing = function () {
        if ($scope.creating) {
            $scope.questions.pop();
            $scope.selectedQuestion = null;
        } else {
            $scope.selectedQuestion.body = $scope.selectedQuestion._body;
            $scope.selectedQuestion.type = $scope.selectedQuestion._type;
        }
        $scope.editing  = false;
        $scope.creating = false;
    };
    $scope.saveQuestion = function () {
        delete $scope.selectedQuestion._body;
        delete $scope.selectedQuestion._type;
        if ($scope.creating) {
            Questions.create($scope.selectedQuestion);
        } else {
            Questions.save($scope.selectedQuestion);
        }
        $scope.editing  = false;
        $scope.creating = false;
    };
    $scope.deleteQuestion = function () {
        for (var i = 0; i < $scope.questions.length; i++) {
            if ($scope.questions[i]._id === $scope.selectedQuestion._id) {
                Questions.delete($scope.selectedQuestion);
                $scope.questions.splice(i, 1);
                break;
            }
        }
        $scope.selectedQuestion = null;
    },
    $scope.isSelected = function (index) {
        return ($scope.selectedQuestion &&
                $scope.selectedQuestion._id ===  $scope.questions[index]._id);
    };
    $scope.proceed = function () {
        $location.path($scope.mode === 'assessment' ? 'answer' : 'search');
    };
});
