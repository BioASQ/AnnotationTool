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

            // post
            $.ajax({
                url: app.data.LogicServer+"questions/"+app.data.question._id,
                contentType: "application/json",
                dataType: "json",
                data: JSON.stringify(app.data.question),
                type: "POST",
                success: function(data){
                    saveBtn.hide();
                    inputField.hide();
                    questionText.show();
                    editBtn.show();
                    questionText.html(app.data.question.body);
                    questionText.attr('data-original-title', app.data.question.body);
                },
                error: function(){
                    alert("Something went wrong");
                }
            });
        };

        var init = function(){
            // get vars
            saveBtn = $("#saveQuestionTitle");
            editBtn = $("#editQuestionTitle");
            inputField = $("#questionTitleInput");
            questionText = $("#questionTitle");

            // expand textarea on focus
            inputField.on('focus', function(){
                inputField.animate({
                    height: "60px"
                });
            })
            .on('blur', function(){
                inputField.animate({
                    height: "20px"
                });
            });

            // assign events
            editBtn.on('click', onEdit);
            saveBtn.on('click', onSave);

            return this;
        };

        return init();
    };

    return EditQuestionWidget;
});
