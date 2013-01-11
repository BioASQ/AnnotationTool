define(function(){    
    var EditQuestionWidget = function(app){
        var that = this;
        var saveBtn, editBtn, inputField, questionText;

        var onEdit = function(){
            editBtn.hide();
            questionText.hide();
            saveBtn.show();
            inputField.show();
            
            inputField.val(app.data.question.body);
        };

        var onSave = function(){
            app.data.question.body = inputField.val();
            app.save();

            $.post(app.data.LogicServer+"questions/"+app.data.question._id, app.data.question, function(){
                saveBtn.hide();
                inputField.hide();
                questionText.show();
                editBtn.show();
                questionText.html(app.data.question.body);
            }).error(function(){
                alert("Something went wrong!");
            });
        };

        var init = function(){
            // get vars
            saveBtn = $("#saveQuestionTitle");
            editBtn = $("#editQuestionTitle");
            inputField = $("#questionTitleInput");
            questionText = $("#questionTitle");

            // assign events
            editBtn.on('click', onEdit);
            saveBtn.on('click', onSave);

            return this;
        };

        return init();
    };

    return EditQuestionWidget;
});
