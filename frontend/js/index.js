require(["app"], function(app) {
    $("#loginButton").click(function(){
        var login = $("#loginEmail").val(),
            pass = $("#loginPassword").val();

        window.location = 'createQuestion.html';

        $.post(app.LogicServer, {email: login, password: pass}, function(data){
            var res;

            try{
                res = $.parseJSON(data);
            }catch(e){
                alert("Something wrong with server");
            }

            console.log(res);

            // set user
            app.user = "";
        });
    });
});