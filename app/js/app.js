var dependencies = [
    'ngRoute',
    'ui',
    'ui.bootstrap',
    'bioasq-at.controllers.question',
    'bioasq-at.controllers.search',
    'bioasq-at.controllers.answer',
    'bioasq-at.controllers.document',
    'bioasq-at.controllers.login',
    'bioasq-at.services.question',
    'bioasq-at.filters'
];

angular.module('bioasq-at', dependencies)
.constant('Routes', [
    {   name:           'questions',
        controllerName: 'QuestionCtrl',
        modes:          [ 'annotation', 'assessment' ] },
    {   name:           'search',
        path:           ':id',
        controllerName: 'SearchCtrl',
        modes:          [ 'annotation' ] },
    {   name:           'answer',
        path:           ':id',
        controllerName: 'AnswerCtrl',
        modes:          [ 'annotation', 'assessment' ] },
    {   name:           'user',
        controllerName: 'UserCtrl',
        navigation:     false,
        modes:          [ 'annotation', 'assessment' ] },
    {   name:           'login',
        controllerName: 'LoginCtrl',
        navigation:     false,
        modes:          [ 'annotation', 'assessment' ] }

])
.config(['$routeProvider', '$locationProvider', 'Routes', function ($route, $location, Routes) {
    angular.forEach(Routes, function (route) {
        $route.when('/' + route.name + (route.path ? '/' + route.path : ''), {
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
