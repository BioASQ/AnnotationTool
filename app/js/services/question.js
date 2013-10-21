angular.module('bioasq-at.services.question', [])
.factory('Questions', function ($http) {
    // var _selectedQuestion = null;
    var _selectedQuestion = {
        body: 'Are CNEs particularly enriched in gene deserts?'
    };

    var equal = function (lhs, rhs) {
        // can be concept, document, statement
        if (lhs.uri && rhs.uri) {
            // concepts and documents both have URIs, so used them
            return (lhs.uri == rhs.uri);
        }
        else if (lhs.s && lhs.p && lhs.o && rhs.s && rhs.s && rhs.p && rhs.o) {
            // statements should have s, p, o
            return (lhs.s == rhs.s && lhs.p && rhs.p && lhs.o && rhs.o);
        }
        return false;
    };

    var keyForType = function (type) {
        return (type + 's');
    };

    var ensureSection = function (key) {
        _selectedQuestion[key] = _selectedQuestion[key] || [];
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
        },
        addAnnotation: function (annotation) {
            if (!_selectedQuestion) { throw RangeError('No quesion selected'); }
            var key = keyForType(annotation.type);
            ensureSection(key);
            _selectedQuestion[key].push(annotation);
        },
        removeAnnotation: function (annotation) {
            if (!_selectedQuestion) { throw RangeError('No quesion selected'); }
            var key = keyForType(annotation.type);
            ensureSection(key);
            var index = indexOf(annotation);
            if (index > -1) {
                _selectedQuestion[key].splice(index, 1);
            }
        },
        hasAnnotation: function (annotation) {
            if (!_selectedQuestion) { throw RangeError('No quesion selected'); }
            var key = keyForType(annotation.type);
            ensureSection(key);
            return _.some(_selectedQuestion[key], function (a) {
                return equal(a, annotation);
            });
        }
    };
});
