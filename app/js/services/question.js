angular.module('bioasq-at.services.question', [])
.factory('Questions', function ($http, $routeParams, $window, $q) {
    var _nextSnippetID = 0;
    var _selectedQuestion = null;
    var kQuestionCacheKey = 'selectedQuestion';

    if ($window.localStorage && typeof $window.localStorage != 'undefined') {
        var value = $window.localStorage.getItem(kQuestionCacheKey);
        if (value) {
            _selectedQuestion = angular.fromJson(value);
        }
    }

    $window.onunload = function () {
        if (_selectedQuestion && $window.localStorage && typeof $window.localStorage != 'undefined') {
            var value = angular.toJson(_selectedQuestion);
            $window.localStorage.setItem(kQuestionCacheKey, value);
        }
    };

    var equal = function (lhs, rhs) {
        if (lhs.type !== rhs.type) { return false; }
        
        switch (lhs.type) {
            case 'concept':
            case 'document':
                return (lhs.uri == rhs.uri);
            case 'statement':
                if (lhs.triples && rhs.triples) {
                    // v2 statements
                    if (lhs.triples.length !== rhs.triples.length) { return false; }
                    for (var i = 0; i < lhs.triples.length; ++i) {
                        if (lhs.triples[i].s !== rhs.triples[i].s ||
                            lhs.triples[i].p !== rhs.triples[i].p ||
                            lhs.triples[i].o !== rhs.triples[i].o) {
                            return false;
                        }
                    }
                    return true;
                } else if (!lhs.triples && !rhs.triples) {
                    // legacy statements
                    return (lhs.s == rhs.s && lhs.p && rhs.p && lhs.o && rhs.o);
                }
                // mixed v2 and legacy statements, cannot be equal
                return false;
            default:
                return false;
        }
    };

    var keyForType = function (type) {
        return (type + 's');
    };

    var ensureSection = function (keyPath) {
        var level = _selectedQuestion,
            parts = keyPath.split('.');
        _.forEach(parts, function (key, idx) {
            if (idx !== (parts.length - 1)) {
                level[key] = level[key] || {};
            } else {
                level[key] = level[key] || [];
            }
            level = level[key];
        });
    };

    var indexOf = function (annotation) {
        var key = keyForType(annotation.type);
        for (var i = 0; i < _selectedQuestion.answer[key].length; i++) {
            if (equal(_selectedQuestion.answer[key][i], annotation)) {
                return i;
            }
        }
        return -1;
    };

    return {
        clearCache: function () {
            _selectedQuestion = null;
            $window.localStorage.removeItem(kQuestionCacheKey);
        },
        select: function (question) {
            if (_selectedQuestion) {
                this.save(_selectedQuestion);
            }
            _selectedQuestion = question;
            if ($window.localStorage && typeof $window.localStorage != 'undefined') {
                var value = angular.toJson(question);
                $window.localStorage.setItem(kQuestionCacheKey, value);
            }
        },

        selectedQuestion: function () {
            return _selectedQuestion;
        },

        create: function (question, cb) {
            $http.post('/backend/questions', question).then(function (result) {
                question._id = result.id;
                cb(result.data);
            });
        },

        save: function (question) {
            if (question.answer && question.answer.snippets) {
                angular.forEach(question.answer.snippets, function (s) {
                    delete s._localID;
                });
            }
            $http.post('/backend/questions/' + question._id, question);
        },

        delete: function (question) {
            $http.delete('/backend/questions/' + question._id);
        },

        load: function (id) {
            var deferred = $q.defer();
            if (_selectedQuestion && _selectedQuestion._id === id) {
                deferred.resolve(_selectedQuestion);
            } else {
                $http.get('/backend/questions/' + id)
                .then(function (response) {
                    if (response.data.answer && response.data.answer.snippets) {
                        angular.forEach(response.data.answer.snippets, function (s) {
                            s._localID = _nextSnippetID++;
                        });
                    }
                    deferred.resolve(response.data);
                });
            }
            return deferred.promise;
        },

        isSelected: function (question) {
            return (_selectedQuestion && (_selectedQuestion.id === question.id));
        },

        addAnnotation: function (annotation) {
            if (!_selectedQuestion) { throw RangeError('No question selected'); }
            var key = keyForType(annotation.type);
            ensureSection('answer.' + key);
            _selectedQuestion.answer[key].push(annotation);
        },

        removeAnnotation: function (annotation) {
            if (!_selectedQuestion) { throw RangeError('No question selected'); }
            var key = keyForType(annotation.type);
            ensureSection('answer.' + key);
            var index = indexOf(annotation);
            if (index > -1) {
                _selectedQuestion.answer[key].splice(index, 1);
            }
        },

        hasAnnotation: function (annotation) {
            if (!_selectedQuestion) { throw RangeError('No question selected'); }
            var key = keyForType(annotation.type);
            ensureSection('answer.' + key);
            return _.some(_selectedQuestion.answer[key], function (a) {
                return equal(a, annotation);
            });
        },
        nextSnippetID: function () {
            return _nextSnippetID++;
        }
    };
});
