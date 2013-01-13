(function (exports) {

    var shared = exports.shared = {};

    /*
     *  Login config
     */
    exports.shared.login = {
        // at least 8 characters long, 1 digit and 1 symbol
        passwordRegEx: "^.*(?=.{8,})(?=.*[\\d])(?=.*[\\W]).*$" 
    };

})((typeof process === 'undefined' || !process.versions) ?
window.shared = window.shared || {} : exports);
