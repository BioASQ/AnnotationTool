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
                switch (xhr.status) {
                case 401:
                    alert('User not found.');
                    break;
                default:
                    alert('Could not login.')
                }
            }
        });
    });
});
