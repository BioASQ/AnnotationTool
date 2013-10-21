angular.module('bioasq-at.filters', []);

// Converts a URI or literal string to an RDF node in
// Turtle notation.
angular.module('bioasq-at.filters').filter('rdf', function () {
    return function (term) {
        if (term.search(/^(https?|mailto|tel|urn):/) === 0) {
            return [ '<', term, '>' ].join('');
        } else if (term.charAt(0) === '_') {
            return term;
        }
        // return '"'.concat(term).concat('"');
        // return '"' + term + '"';
        return [ '"', term, '"' ].join('');
    };
});
