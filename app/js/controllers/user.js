angular.module('bioasq-at.controllers.user', [])
.controller('UserCtrl', function ($scope, $window, $http) {
    $scope.user = {};
    $scope.messages = [];

    $scope.cancel = function () {
        $window.history.back();
    };

    $scope.save = function () {
        $scope.messages = [];

        if ($scope.user.password1 !== $scope.user.password2) {
            $scope.messages.push({
                type: 'error',
                text: 'Passwords do not match!'
            });
        }
        if (!$scope.user.password1) {
            $scope.messages.push({
                type: 'warning',
                text: 'Nothing changed.'
            });
            return;
        }
        if (!$scope.user.password) {
            $scope.messages.push({
                type: 'error',
                text: 'Old password required!'
            });
        }
        var regExp = new RegExp('^.*(?=.{8,})(?=.*[\\d])(?=.*[\\W]).*$', 'g');
        if (regExp.test($scope.user.password1) === false) {
            $scope.messages.push({
                type: 'error',
                text: 'Password does not meet criteria. Must be at least 8 characters long, 1 digit and 1 symbol'
            });
            return;
        }
        $http.post('/backend/changePassword/', {
            oldPassword: $scope.user.password,
            newPassword: $scope.user.password1
        }).success(function (data, status) {
            $scope.messages.push({
                type: 'success',
                text: 'Password successfully changed.'
            });
        }).error(function (data, status) {
            $scope.messages.push({
                type: 'error',
                text: status ===  401 ? 'Wrong password!' : 'Could not save changes.'
            });
        });
    };
});
