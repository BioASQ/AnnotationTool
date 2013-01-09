require(["app"], function(app) {
    $("#loginButton").click(function() {
        var email = $("#loginEmail").val(),
            pass = $("#loginPassword").val();

        var req = $.ajax({
            'type': 'POST',
            'url': app.data.LogicServer + 'login',
            'data': { 'email': email, 'password': pass },
            'success': function (data) {
                // set user
                app.data.user = data.usermail;
                window.location = 'createQuestion.html';
            },
            'error': function (xhr, status, httpStatus) {
                if (xhr.status == 401){
                    alert('User not found.');
                }else{
                    alert('Could not login.');
                }
            }
        });
    });

    $("#doRegister").click(function(){
        var email = $("#userEmail").val(),
            pass = $("#userPass").val(),
            passAgain = $("#userPassRepeat").val(),
            name = $("#userName").val();

        if(pass != passAgain){
            alert("Passwords doesn't match");
            return;
        }

        $.post(app.data.LogicServer + 'register',
            {email: email, password: pass, name: name},
            function(data){
                $("#regModal").modal("hide");
            }
        )
        .error(function(resp){
            var data = $.parseJSON(resp.responseText);
            alert(data.error);
        });
    });
});
