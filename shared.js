(function (exports) {

var shared = exports.shared = {};

/*
 * Constants
 */
const MODE_ANNOTATION = exports.shared.MODE_ANNOTATION = 0;
const MODE_ASSESSMENT = exports.shared.MODE_ASSESSMENT = 1;

/*
 *  Login config
 */
exports.shared.login = {
    // at least 8 characters long, 1 digit and 1 symbol
    passwordRegEx: "^.*(?=.{8,})(?=.*[\\d])(?=.*[\\W]).*$" 
};

/*
* Switch between annotation and assessment mode.
* Possible values: MODE_ANNOTATION, MODE_ASSESSMENT.
*/
exports.shared.mode = MODE_ASSESSMENT;

exports.shared.description = 'Assessment Tool for benchmark creation';

})((typeof process === 'undefined' || !process.versions) ?
window.shared = window.shared || {} : exports);
