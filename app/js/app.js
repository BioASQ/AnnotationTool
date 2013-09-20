angular.module('bioasq-at', ['ngRoute', 'ui', 'bioasq-at.controllers'])
.constant('Routes', [
    {   name:           'questions',
        controllerName: 'QuestionCtrl',
        modes:          [ 'annotation', 'assessment' ] },
    {   name:           'search',
        controllerName: 'SearchCtrl',
        modes:          [ 'annotation' ] },
    {   name:           'answer',
        controllerName: 'AnswerCtrl',
        modes:          [ 'annotation', 'assessment' ] },
    {   name:           'login',
        controllerName: 'LoginCtrl',
        navigation:     false,
        modes:          [ 'annotation', 'assessment' ] }

])
.config(['$routeProvider', '$locationProvider', 'Routes', function ($route, $location, Routes) {
    angular.forEach(Routes, function (route) {
        $route.when('/' + route.name, {
            templateUrl: 'views/' + route.name + '.html',
            controller:  route.controllerName
        });
    });

    $route.when('/', {
        redirectTo: '/questions'
    });

    $location.html5Mode(false).hashPrefix('!');
}])
.config(['$httpProvider', function ($http) {
    $http.responseInterceptors.push(['$location', '$q', function ($location, $q) {
        function success(response) { return response; }
        function error(response) {
            if (response.status === 401 || response.status === 403) {
                $location.path('login');
                return $q.reject(response);
            }
            return $q.reject(response);
        }
        return function (promise) {
            return promise.then(success, error);
        };
    }]);
}])
.run(['$rootScope', 'Routes', function ($scope, Routes) {
    $scope.mode = 'annotation';
    // $scope.mode = 'assessment';

    $scope.routes = [];
    angular.forEach(Routes, function (r) {
        if ((r.modes.indexOf($scope.mode) > -1) && (r.navigation !== false)) {
            $scope.routes.push(r);
        }
    });
}]);

/*
 * Controller module
 */
angular.module('bioasq-at.controllers', ['bioasq-at.services'])
.controller('LoginCtrl', function ($scope, $http, $location) {
    $scope.login = function () {
        $http.post('/backend/login', { email: $scope.email, password: $scope.password })
            .success(function () { $location.path('questions')})
            .error(function () {});
    };
})
.controller('QuestionCtrl', function ($scope, $http, $location, Questions) {
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
        $scope.questions.push({});
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
})
.controller('SearchCtrl', function ($scope, Questions) {
    $scope.question = Questions.selectedQuestion();
})
.controller('AnswerCtrl', function ($scope, Questions) {
    $scope.question = Questions.selectedQuestion();
});

/*
 * Service module
 */
angular.module('bioasq-at.services', [])
.factory('Questions', function ($http) {
    var _selectedQuestion = null;
    return {
        select: function (question) {
            _selectedQuestion = question;
        },
        selectedQuestion: function () {
            return _selectedQuestion;
        },
        create: function (question) {
            $http.post('/backend/questions', question).then(function (result) {
                question._id = result.id;
            });
        },
        save: function (question) {
            $http.post('/backend/questions/' + question._id, question);
        },
        delete: function (question) {
            $http.delete('/backend/questions/' + question._id);
        },
        isSelected: function (question) {
            return (_selectedQuestion && (_selectedQuestion.id === question.id));
        }
    };
});
