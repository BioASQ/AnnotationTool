var
    nodemailer = require('nodemailer'),
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

    var html = config.mail.register;

    var pass = user.password.replace(/\$/g, "$$$$");

    html = html.replace("%USERNAME%", user.name);
    html = html.replace("%USER%", user.email);
    html = html.replace("%PASSWORD%", pass);
    html = html.replace("%URL%", url);
    html = html.replace("%USEREMAIL%", encodeURIComponent(user.email));
    html = html.replace("%ACTIVATIONCODE%", encodeURIComponent(user.active));

   this.transport.sendMail(this._mailOptions(user.email, html), function (error, responseStatus) {
        callback(error, responseStatus);
    });
};

Mail.prototype.resetPassword = function (email, tmpPassword, url, callback) {

    var html = config.mail.resetPassword;
    var pass = tmpPassword.replace(/\$/g, "$$$$");
    html = html.replace("%NEWPASSWORD%", pass);
    html = html.replace("%URL%", url);
    html = html.replace("%EMAIL%", encodeURIComponent(email));
    html = html.replace("%NEWPASSWORD%", encodeURIComponent(tmpPassword));

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
        subject: 'BioASQ Annotation Tool',
        html: html
    };
};
