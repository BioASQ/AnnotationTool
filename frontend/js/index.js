require(["app"], function (app) {

    // check for login
    if (app.user) {
        window.location = 'createQuestion.html';
    }

    // alert hide function
    $('.alert .close').live("click", function (e) {
        $(this).parent().hide();
    });

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
                app.data.username = data.username;
                window.location = 'createQuestion.html';
            },
            'error': function (xhr, status, httpStatus) {
                if (xhr.status == 401){
                    $("#noUser").show();
                } else {
                    $("#noLogin").show();
                }
            }
        });
        // prevent default action (form submit)
        return false;
    });

    $("#doRegister").click(function(){
        var email = $("#userEmail").val(),
            pass = $("#userPass").val(),
            passAgain = $("#userPassRepeat").val(),
            name = $("#userName").val();

        if (pass != passAgain) {
            $("#noMatch").show();
            return;
        } else {

            var regExpObj = new RegExp(window.shared.shared.login.passwordRegEx, "g");
            if (regExpObj.test(pass) == false) {
                $("#noRegexp").show();
                return
            }
        }

        $.post(app.data.LogicServer + 'register',
            {email: email, password: pass, name: name},
            function(data){
                $("#regModal").modal("hide");
            }
        )
        .error(function (resp) {
            $("#noMiscTxt").text(' ' + resp.responseText);
            $("#noMisc").show();
        });
    });

    $("#forgotPassword").click(function () {
        var email = $.trim($("#loginEmail").val());

        if (email.length > 0) {
            $("#forgotWait").show();
            $.get(app.data.LogicServer + 'resetPassword',
            { email: email},
            function (data) {
                $("#forgotWait").hide();
                $("#forgotSuccess").show();
            })
            .error(function (resp) {
                $("#forgotError").show();
            });

        } else {
            $("#forgotWarning").show();
        }
    });
});
