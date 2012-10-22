var Login = exports.Login = function (callback_url) {
    this.callback_url = callback_url;
};

Login.prototype.login = function (get_para) {
    // TODO: ping the idp and use an online one
    // ...
    // ...
    
    return this._myopenlink(get_para);
};
/* https://foafssl.org/srv/idp?rs=<callback_url> */
Login.prototype._foafssl = function (get_para) {

    var webid = '', ts = '', sig = '', splited = '';
    var loggedin = false;
    if (get_para) {
        splited = get_para.split("&");
        for (var i = 0; i < splited.length; i++) {
            if (splited[i].indexOf("webid=") == 0)
                webid = decodeURIComponent(splited[i].split("=")[1]);
            else if (splited[i].indexOf("ts=") == 0)
                ts = decodeURIComponent(splited[i].split("=")[1]);
            else if (splited[i].indexOf("sig=") == 0) {
                sig = splited[i].split("=")[1];
                //  base64-URL-safe to base64
                sig = sig.replace(/-/g, "+").replace(/\_/g, "/") + "==";
            }
        }
        
        if (webid != '' && ts != '' && sig != '') {

            cert = ["-----BEGIN PUBLIC KEY-----",
            "MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAkJOsAoUbVJfNfK59t125",
            "efvukOqKlOjS6OIfOlhtH/8VxVXaMQO/n90cOiILwFDjlixbOFYywRHmoPcTNpfE",
            "nzePpaLqbztyO0XarSaxBEKZ6aRgdDBcgvnhMqmIjOUB5TiYtN1DdpaRnIZlklUq",
            "dvcIzM7df+rSMgzwTNFHM53Y15zUhLosWh3KC5C/v7lLNIg0m2YR2Py36oqsO0+A",
            "aH4aGOKdsbKjZEN2Ld0Rn3HxEEMPSTpGpUOlULf65prN1oNK8EnijPjlgLz9q2w4",
            "CFwjOzzyd40fO7zPRejwOxPdWaf/DdF2+KArSurqovF+XtGZK2sGneEOXU5QY8qM",
            "3wIDAQAB",
             "-----END PUBLIC KEY-----"].join("\n");

            var data = this.callback_url + "?" + splited[0] + "&" + splited[1];

            // check
            verifier = require('crypto').createVerify("RSA-SHA1");
            verifier.update(data);
            loggedin =  verifier.verify(cert, sig, 'base64');
        }
    }
    return this._buildreturn(webid, loggedin, "https://foafssl.org/srv/idp?rs=");
};

/* https://id.myopenlink.net/ods/webid_verify.vsp?callback=<callback_url> */
Login.prototype._myopenlink = function (get_para) {
   
    var webid = '', ts = '', md5 = '', sha1 = '', subj = '', elapsed = '', signature = '', splited = '';
    var loggedin = false;
    if (get_para) {
        splited = get_para.split("&");
        for (var i = 0; i < splited.length; i++) {
            if (splited[i].indexOf("webid=") == 0)
                webid = decodeURIComponent(splited[i].split("=")[1]);
            else if (splited[i].indexOf("ts=") == 0)
                ts = decodeURIComponent(splited[i].split("=")[1]);
            else if (splited[i].indexOf("md5=") == 0)
                md5 = decodeURIComponent(splited[i].split("=")[1]);
            else if (splited[i].indexOf("sha1=") == 0)
                sha1 = decodeURIComponent(splited[i].split("=")[1]);
            else if (splited[i].indexOf("subj=") == 0)
                subj = decodeURIComponent(splited[i].split("=")[1]);
            else if (splited[i].indexOf("elapsed=") == 0)
                elapsed = decodeURIComponent(splited[i].split("=")[1]);
            else if (splited[i].indexOf("signature=") == 0)
                signature = decodeURIComponent(splited[i].split("=")[1]);
        }
       
        if (webid != '' && ts != '' && md5 != '' && sha1 != '' && subj != '' && signature != '') {

            cert = ["-----BEGIN PUBLIC KEY-----",
          "MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAzheeaWtNU2byuAAx9HQ3",
          "sSqNjW/yP6axvwdKOh2wvkewliD9j3tQPv2YxeXeGC2lZ4jN6miNb6G/QgzRBtbO",
          "ZgBRJpf7PVqgVTpHFX7mpBL5xxG3BJN7dfwDpUj+AwIYmQluePQoh5NfXRetDC1e",
          "hOH6278tPze90wPCk3lDnC20rySAxIcRSsh2h+WwJ6hDZbXA/PEUhgv7oevPH7QA",
          "lHzF0iqoxjwn9dUNKAuHVQpGmMSfK4We3n4svqb5onBWjzvYR976v9OFwkqRep9c",
          "Ich4NJ7TB74J2EtyF+Q337ABF9rvMeCrGzfjeckpyxL5TxlKwUA7vOosfsckriOV",
          "xwIDAQAB",
          "-----END PUBLIC KEY-----"].join("\n");

            var data = this.callback_url + "?" + splited[0] + "&" + splited[1] + "&" + splited[2] + "&" + splited[3] + "&" + splited[4] + "&" + splited[5];

            verifier = require('crypto').createVerify("RSA-SHA1");
            verifier.update(data);
            loggedin = verifier.verify(cert, signature, 'base64');
        }
    } 

    return this._buildreturn(webid, loggedin, "https://id.myopenlink.net/ods/webid_verify.vsp?callback=");
};

Login.prototype._buildreturn = function (webid, loggedin, idpURL) {
    return {
        'webid': webid,
        'loggedin': loggedin,
        'loginURL': idpURL + this.callback_url 
    };   
};

