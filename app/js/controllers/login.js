angular.module('bioasq-at.controllers.login', [])
.controller('LoginCtrl', function ($scope, $http, $location) {
    $scope.login = function () {
        $scope.messages = [];
        if (!$scope.email) {
            $scope.messages.push({
                type: 'error',
                text: 'Email address required'
            });
            return;
        }
        if (!$scope.password) {
            $scope.messages.push({
                type: 'error',
                text: 'Password required'
            });
            return;
        }

        $http.post('/backend/login', { email: $scope.email, password: $scope.password })
        .success(function () {
            $location.path('questions');
        })
        .error(function (data, status) {
            if (status === 401 || status === 403) {
                $scope.messages.push({
                    type: 'error',
                    text: 'Invalid credentials!'
                });
            } else {
                $scope.messages.push({
                    type: 'error',
                    text: 'Could not sign in (' + status + ')'
                });
            }
        });
    };

    $scope.resetPassword = function () {
        $scope.messages = [];
        if (!$scope.email) {
            $scope.messages.push({
                type: 'error',
                text: 'Email address required'
            });
            return;
        }
        $http.get('/backend/resetPassword', { params: { email: $scope.email } })
        .success(function () {
            $scope.messages.push({
                type: 'success',
                text: 'Password reset email sent.'
            });
        })
        .error(function (data, status) {
            $scope.messages.push({
                type: 'error',
                text: 'Could not send reset email.'
            });
        });
    };
});
