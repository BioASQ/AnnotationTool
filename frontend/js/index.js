require(["app"], function(app) {
    $("#loginButton").click(function(){
        var login = $("#loginEmail").val(),
            pass = $("#loginPassword").val();

        window.location = 'createQuestion.html';

        $.post(app.data.LogicServer, {email: login, password: pass}, function(data){
            console.log(data);

            // set user
            app.data.user = "";
        });
    });
});