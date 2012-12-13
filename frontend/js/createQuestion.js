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

    // bind create question stuff
    $("#newQuestionCancel").click(function(){
        newQuestionLabel.val("");
    });
    $("#newQuestionOK").click(function(){
        var label = newQuestionLabel.val(),
            type = newQuestionType.val(),
            user = app.data.user,

            question = {body:label, type:type, creator:user};

        $.post(app.data.LogicServer+"questions", question, function(data){
            question['_id'] = data.id;
            
            var html = questionTemplate(question);

            questionList.append($(html));

            newQuestionModal.modal('hide');
        }).error(function(){
            alert("Something went wrong");
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
});