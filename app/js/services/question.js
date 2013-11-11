angular.module('bioasq-at.services.question', [])
.factory('Questions', function ($http, $routeParams, $window, $q, $rootScope) {
    var _nextSnippetID = 0;
    var _selectedQuestion = null;
    var kQuestionCacheKey = 'selectedQuestion';

    $rootScope.$on('questionSelected', function () {
        _selectedQuestion = null;
    });

    $rootScope.$on('signin', function () {
        _selectedQuestion = null;
        $window.localStorage.removeItem(kQuestionCacheKey);
    });

    if ($window.localStorage && typeof $window.localStorage != 'undefined') {
        var value = $window.localStorage.getItem(kQuestionCacheKey);
        if (value) {
            _selectedQuestion = angular.fromJson(value);
        }
    }

    $window.onunload = function () {
        saveLocal();
    };

    var saveLocal = function () {
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
        for (var i = 0; i < _selectedQuestion[key].length; i++) {
            if (equal(_selectedQuestion[key][i], annotation)) {
                return i;
            }
        }
        return -1;
    };

    return {
        select: function (question) {
            if (_selectedQuestion) {
                this.save(_selectedQuestion);
            }
            _selectedQuestion = question;
            saveLocal();
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
            // create shallow copy
            var copy = _.clone(question);
            if (question.snippets) {
                copy.snippets = [];
                // modify deeply copied snippets
                angular.forEach(question.snippets, function (s) {
                    var snippetCopy = _.clone(s);
                    delete snippetCopy._localID;
                    copy.snippets.push(snippetCopy);
                });
            }
            $http.post('/backend/questions/' + copy._id, copy);
            saveLocal();
        },

        setFinalized: function (finalized) {
            _selectedQuestion.finalized = finalized;
            $http.post('/backend/questions/' + _selectedQuestion._id, {
                _id: _selectedQuestion._id,
                finalized: !!finalized
            });
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
                .success(function (data, status) {
                    if (data.snippets) {
                        angular.forEach(data.snippets, function (s) {
                            s._localID = _nextSnippetID++;
                        });
                    }
                    deferred.resolve(data);
                })
                .error(function (data, status) {
                    alert('Error loading question.');
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
            ensureSection(key);
            _selectedQuestion[key].push(annotation);
        },

        removeAnnotation: function (annotation) {
            if (!_selectedQuestion) { throw RangeError('No question selected'); }
            var key = keyForType(annotation.type);
            ensureSection(key);
            var index = indexOf(annotation);
            if (index > -1) {
                _selectedQuestion[key].splice(index, 1);
            }
        },

        hasAnnotation: function (annotation) {
            if (!_selectedQuestion) { throw RangeError('No question selected'); }
            var key = keyForType(annotation.type);
            ensureSection(key);
            return _.some(_selectedQuestion[key], function (a) {
                return equal(a, annotation);
            });
        },
        nextSnippetID: function () {
            return _nextSnippetID++;
        }
    };
});
