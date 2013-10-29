angular.module('bioasq-at.filters', []);

// Converts a URI or literal string to an RDF node in
// Turtle notation.
angular.module('bioasq-at.filters')
.filter('rdf', function () {
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
})
// Strips white space and quotation marks from beginning
// and end of string
.filter('strip', function () {
    return function (term) {
        return term.replace(/^["\s]+|["\s]+$/g, '');
    };
})
.filter('highlight', function ($sce) {
    return function (text, ranges) {
        if (!ranges.length) { return text; }
        // make sure ranges are sorted
        ranges = _.sortBy(ranges, function (range) {
            return range.begin;
        });
        // stuff before the first range
        var highlighted = text.substring(0, ranges[0].begin);
        _.forEach(ranges, function (range) {
            highlighted += '<span class="concept-highlight">'
                        +  text.substring(range.begin, range.end)
                        +  '</span>';
        });
        // stuff after the last range
        highlighted += text.substring(ranges[ranges.length - 1].end);

        return $sce.trustAsHtml(highlighted);
    };
});
