var
    nodemailer = require('nodemailer')
    config = require(require('path').join(__dirname, '..', 'config')).defaults;

var Mail = exports.Mail = function () {
    this.transport = nodemailer.createTransport('SMTP', {
        service: 'Gmail',
        auth: {
            user: config.mail.address,
            pass: config.mail.password
        }
    });
};

Mail.prototype.createUser = function (user,url,  callback) {

    var html =
        'Welcome to BioASQ Annotation Tool. <br /><br />' +
        'user: ' + user.email + '<br />' +
        'password: ' + user.password + '<br />' +
        '<a href="' + url +
            '?email=' + encodeURIComponent(user.email) +
             '&code=' + encodeURIComponent(user.active) +
             '">Click the link to activate your account.</a>';

   this.transport.sendMail(this._mailOptions(user.email, html), function (error, responseStatus) {
        callback(error, responseStatus);
    });
};

Mail.prototype.resetPassword = function (email, tmpPassword, url, callback) {

    var html =
        'Click the link to reset your password to: ' + tmpPassword + '<br /><br />' +
        '<a href="' + url +
            '?email=' + encodeURIComponent(email) +
            '&code=' + encodeURIComponent(tmpPassword) +
            '">Reset password now.</a>';

    this.transport.sendMail(
        this._mailOptions(email, html),
        function (error, responseStatus) {           
            callback(error, responseStatus);
    });
};

Mail.prototype._mailOptions = function (email, html) {
    return {
        from: this.mail,
        to: email,
        generateTextFromHTML: true,
        subject: 'BioASQ Annotation Tool ',
        html: html
    };
}
