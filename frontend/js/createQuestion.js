require(["app"], function(app) {
    // compile templates
    var questionTemplate,
        source;
    // question templaet
    source = $("#questionTemplate").html();
    questionTemplate = Handlebars.compile(source);

    // cache dom
    var questionList = $("#question"),
        newQuestionLabel = $("#newQuestionLabel"),
        newQuestionType = $("#newQuestionType"),
        newQuestionModal = $("#newQuestionModal");



    // fetch question list on load
    $.getJSON(app.LogicServer+'questions', function(data){
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

    // bind create question
    $("#newQuestionCancel").click(function(){
        newQuestionLabel.val("");
    });
    $("#newQuestionOK").click(function(){
        var label = newQuestionLabel.val(),
            type = newQuestionType.val(),
            user = app.user,

            question = {body:label, type:type, creator:user};

        $.post(app.LogicServer+"questions", question, function(data){
            question['_id'] = data.id;
            
            var html = questionTemplate(question);

            questionList.append($(html));

            newQuestionModal.modal('hide');
        }).error(function(){
            alert("Something went wrong");
        });
    });
});