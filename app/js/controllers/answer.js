angular.module('bioasq-at.controllers.answer', [])
.controller('AnswerCtrl', function ($scope, Questions) {
    $scope.question = Questions.selectedQuestion();
});
