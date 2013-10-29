var dependencies = [
    'ngRoute',
    'ngCookies',
    'ui',
    'ui.bootstrap',
    'spin.js',
    'bioasq-at.controllers.question',
    'bioasq-at.controllers.search',
    'bioasq-at.controllers.answer',
    'bioasq-at.controllers.document',
    'bioasq-at.controllers.login',
    'bioasq-at.controllers.user',
    'bioasq-at.services.question',
    'bioasq-at.filters'
];

angular.module('bioasq-at', dependencies)
.value('$anchorScroll', angular.noop)
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
        $route.when('/' + route.name + (route.path ? '/' + route.path + '?' : ''), {
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
                if (response.config.url.indexOf('/changePassword') === -1) {
                    $location.path('login');
                }
            }
            return $q.reject(response);
        }
        return function (promise) {
            return promise.then(success, error);
        };
    }]);
}])
.run(['$rootScope', '$cookies', 'Routes', function ($scope, $cookies, Routes) {
    $scope.mode = 'annotation';
    // $scope.mode = 'assessment';

    $scope.$watch('user', function (newValue, oldValue) {
        if (!newValue || !oldValue || newValue.id !== oldValue.id) {
            $cookies.user = angular.toJson(newValue);
        }
    });
    if ($cookies.user) {
        $scope.user = angular.fromJson($cookies.user);
    }

    $scope.routes = [];
    angular.forEach(Routes, function (r) {
        if ((r.modes.indexOf($scope.mode) > -1) && (r.navigation !== false)) {
            $scope.routes.push(r);
        }
    });
}]);
