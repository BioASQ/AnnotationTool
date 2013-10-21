angular.module('bioasq-at.services.question', [])
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
