require(["app"], function (app) {

    $("#changePassword").click(function () {


        var oldPassword = $.trim($("#oldPassword").val()),
            newPassword1 = $.trim($("#newPassword1").val()),
            newPassword2 = $.trim($("#newPassword2").val());

        if (oldPassword.length > 0)
            if (newPassword1.length > 0)
                if (newPassword2.length > 0) {

                    if (newPassword1 != newPassword2) {
                        alert("Passwords doesn't match");
                        return;
                    } else if (newPassword1 == oldPassword) {
                        alert("Nothing to change. New and old password are equal.");
                        return;
                    } else {
                        var regExpObj = new RegExp(window.shared.shared.login.passwordRegEx, "g");
                        if (regExpObj.test(newPassword1) == false) {
                            alert("Password at least 8 characters long, 1 digit and 1 symbol.");
                            return;
                        }
                    }

                    $.post(app.data.LogicServer + 'changePassword', { oldPassword: oldPassword, newPassword: newPassword1 }, function (data) {
                        $("#oldPassword").val('');
                        $("#newPassword1").val('');
                        $("#newPassword2").val('');
                        $("#newPassword1").attr('placeholder', 'Congratulations.');
                        $("#newPassword2").attr('placeholder', 'Password successfully changed.');
                        $("#oldPassword").attr('placeholder', 'Your new BioASQ-AT password has been set.');

                    }).error(function (resp) {
                        alert(resp.responseText);
                    });
                }
    });
});
