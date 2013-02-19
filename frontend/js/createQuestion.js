require(["app"], function (app) {
    // compile templates
    var questionTemplate,
        source;
    // question templaet
    source = $("#questionTemplate").html();
    questionTemplate = Handlebars.compile(source);

    var editTemplate = Handlebars.compile($('#editQuestionTemplate').html());

    // cache dom
    var questionList = $("#question"),
        newQuestionLabel = $("#newQuestionLabel"),
        newQuestionType = $("#newQuestionType"),
        newQuestionModal = $("#newQuestionModal");



    var fetchQuestions = function () {
        // fetch question list on load
        $.getJSON(app.data.LogicServer+'questions', function(data){
            var i, question,
                html = "";
            for(i = 0; i < data.questions.length; i++){
                question = data.questions[i];
                if( typeof question == 'undefined' ) continue;

                // render to string
                html += questionTemplate(question);
            }

            // append to dom
            questionList.html(html);
        });
    }

    fetchQuestions();

    // bind create question stuff
    $("#newQuestionCancel").click(function(){
        newQuestionLabel.val("");
    });
    $("#newQuestionOK").click(function(){
        var label = newQuestionLabel.val(),
            type = newQuestionType.val(),

            question = {body:label, type:type};

        // clean
        newQuestionType.val("list");
        newQuestionLabel.val("");

        // post
        $.ajax({
            url: app.data.LogicServer+"questions/",
            contentType: "application/json",
            dataType: "json",
            data: JSON.stringify(question),
            type: "POST",
            success: function(data){
                question['_id'] = data.id;
            
                var html = questionTemplate(question);
                questionList.append($(html));

                newQuestionModal.modal('hide');
            },
            error: function(){
                alert("Something went wrong");
            }
        });
    });

    // bind ok action
    $("#okButton").click(function(){
        var questionID = questionList.val();

        $.getJSON(app.data.LogicServer+'questions/'+questionID, function(data){
            app.data.question = data;
            app.save();

            window.location = 'search.html';
        });
    });

    $('#editButton').click(function () {
        var questionID = questionList.val();
        $.getJSON(app.data.LogicServer + 'questions/' + questionID, function (data) {
            questionTypes = [
                { name: 'decisive', label: 'Yes/No', active: data.type == 'decisive' },
                { name: 'factoid', label: 'Factoid', active: data.type == 'factoid' },
                { name: 'list', label: 'List', active: data.type == 'list' },
                { name: 'summary', label: 'Summary', active: data.type == 'summary' },
            ];

            var html = editTemplate($.extend({}, data, { questionTypes: questionTypes }));
            $('#editQuestionModal').html(html);
            $('#editQuestionModal').modal();
        });
    });

    $('#editQuestionOK').live('click', function () {
        var label      = $('#editQuestionLabel').val(),
            type       = $("#editQuestionType").val(),
            question   = { body: label, type: type },
            questionID = questionList.val();

        // do post request
        $.ajax({
            url: app.data.LogicServer + 'questions/' + questionID,
            contentType: 'application/json',
            dataType: 'json',
            data: JSON.stringify(question),
            type: 'POST',
            success: function (data) {
                fetchQuestions();
                $('#editQuestionModal').modal('hide');
            },
            error: function () { alert('Could not update question.'); }
        });
    });

    $('#editQuestionDelete').live('click', function () {
        if (confirm('The whole question including annotations will be deleted.\n\nAre you sure?')) {
            var questionID = questionList.val();
            // do delete request
            $.ajax({
                url: app.data.LogicServer + 'questions/' + questionID,
                type: 'DELETE',
                success: function () {
                    fetchQuestions();
                    $('#editQuestionModal').modal('hide');
                },
                error: function () { alert('Could not delete question.'); }
            });
        }
    });
});
