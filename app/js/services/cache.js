angular.module('bioasq-at.services.cache', [])
.factory('Cache', ['$rootScope', function ($scope) {
    var _data = {};
    $scope.$on('questionSelected', function () {
        _data = {};
    });
    return {
        set: function (key, value) {
            _data[key] = value;
        },
        get: function (key) {
            return _data[key];
        },
        has: function (key) {
            return !!_data[key];
        },
        remove: function (key) {
            delete _data[key];
        },
        clear: function () {
            _data = {};
        }
    };
}]);
