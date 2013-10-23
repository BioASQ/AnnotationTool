angular.module('bioasq-at.controllers.answer', [])
.controller('AnswerCtrl', function ($scope, Questions, $routeParams) {
    var id = $routeParams.id;
    $scope.question = Questions.selectedQuestion();
    $scope.selection = {};
    Questions.load(id).then(function (response) {
        angular.forEach(response.data, function (value, key) {
            $scope.question[key] = value;
        });
    });

    $scope.canAddEntry = function () {
        return this.question.answer.exact[this.question.answer.exact.length - 1][0] !== '';
    };

    $scope.addEntry = function () {
        if (this.canAddEntry()) {
            this.question.answer.exact.push(['']);
        }
    };

    $scope.canAddSynonym = function (i) {
        if (typeof i != 'undefined') {
            return this.question.answer.exact[i][this.question.answer.exact[i].length - 1] !== '';
        } else {
            return this.question.answer.exact[this.question.answer.exact.length - 1] !== '';
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
});
