var
    nodemailer = require('nodemailer');

var Mail = exports.Mail = function () {

    this.transport = nodemailer.createTransport('SMTP', {
        service: 'Gmail',
        auth: {
            user: 'BioAsqAT@gmail.com',
            pass: '******'
        }
    });
};


Mail.prototype.sendEMail = function (email, html, callback) {

    var mailOptions = {
        from: 'BioAsqAT@gmail.com',
        to: email,
        generateTextFromHTML: true,
        subject: 'BioASQ Annotation Tool ',
        html: html
    };

    this.transport.sendMail(mailOptions, function (error, responseStatus) {
        callback(error, responseStatus);
    });
};