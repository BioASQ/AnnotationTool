angular.module('bioasq-at.controllers.login', [])
.controller('LoginCtrl', function ($scope, $http, $location) {
    $scope.login = function () {
        $http.post('/backend/login', { email: $scope.email, password: $scope.password })
            .success(function () { $location.path('questions'); })
            .error(function () {});
    };
});
