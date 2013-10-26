var annotationTemplate = Handlebars.compile('<span class="snippet-annotation">{{text}}<a class="delete-annotation" data-id="{{id}}" title="Delete snippet"><i class="icon-remove"></i></a></span>');

rangy.init();
var tempClassApplier = rangy.createCssClassApplier('temp-highlight'),
    highlighter      = rangy.createHighlighter();
    highlighter.addClassApplier(tempClassApplier);

var sectionConfig = {};
var angularScope;

var compareSnippets = function (op1, op2) {
    if (op1.endSection < op2.beginSection) {
        return -1;
    } else if (op1.beginSection > op2.endSection) {
        return 1;
    } else {
        if (op1.endIndex < op2.beginIndex) {
            return -1;
        } else if (op1.beginIndex > op2.endIndex) {
            return 1;
        } else {
            throw Error('Overlapping snippets!');
        }
    }
};

var highlightSnippetsInSection = function (scope, answer, document, section, sectionName, allowOverlaps) {
    angularScope = scope;
    var hasMultipleSnippets = false;
    var orderedSnippets = answer.snippets.filter(function (annotation) {
        return (annotation.document === document.uri &&
                annotation.beginSection === sectionName);
    });

    if (orderedSnippets.length > 1) {
        sectionConfig[sectionName] = sectionConfig[sectionName] || {
            currentSnippet: 0,
            numberOfSnippets: orderedSnippets.length
        };
    }

    try {
        orderedSnippets = orderedSnippets.sort(compareSnippets).reverse();
    } catch (e) {
        if (!allowOverlaps) {
            throw e;
        }
        hasMultipleSnippets = true;
        orderedSnippets = orderedSnippets.slice(sectionConfig[sectionName].currentSnippet,
                                                sectionConfig[sectionName].currentSnippet + 1);
    }

    var originalLength = section.length;
    orderedSnippets.forEach(function (snippetAnnotation, snippetIndex) {
        var highlighted = annotationTemplate({
            text: snippetAnnotation.text,
            id:   snippetAnnotation.localID
        });

        section = section.substring(0, snippetAnnotation.beginIndex)
                + highlighted
                + section.substring(snippetAnnotation.endIndex);
    });

    return { hasMultipleSnippets: hasMultipleSnippets, text: section };
};

var doesSnippetOverlapWithSnippets = function (snippet, snippets) {
    return snippets.some(function (s) {
        try {
            compareSnippets(snippet, s);
        } catch (e) {
            return true;
        }
    });
};

// annotationButton.click
var snippetForSelection = function ($annotateButton) {
    var selection, range;
    try {
        selection = rangy.getSelection();
        range     = selection.getRangeAt(0);
    } catch (e) {
        alert('Please select text.');
        return false;
    }

    if (range.startOffset === range.endOffset) {
        return;
    }

    var startSectionName = $(range.startContainer).closest('.section').data('sectionName'),
        endSectionName   = $(range.endContainer).closest('.section').data('sectionName');

    if (startSectionName !== endSectionName) {
        alert('Snippets spanning sections are currently not supported!');
        return;
    }

    var cRange, newSnippet;
    if (typeof startSectionName !== 'undefined' && typeof endSectionName !== 'undefined') {
        cRange = range.toCharacterRange($(range.startContainer).closest('.section').get(0));
        newSnippet = {
            type: 'snippet',
            beginSection: startSectionName,
            endSection: endSectionName,
            beginIndex: cRange.start,
            endIndex: cRange.start + String(range).length,
            text: String(range)
        };
    }

    $annotateButton.fadeOut(500);
    highlighter.removeAllHighlights();

    return newSnippet;
};

var $viewer, $annotateButton;
var initAnnotationState = function() {
    $viewer = angular.element('#viewer');

    $(document).on('click', '.delete-annotation', function () {
        if (angularScope) {
            var localID = $(this).data('id');
            angularScope.$broadcast('delete-annotation', localID);
        }
    });

    // bodyMouseUp();
};

var keepSelection = false;

// annotationButton.mouseDown
setKeepSelection = function (keep) {
    keepSelection = keep;
};

// viewer.mouseDown
var viewerMouseDown = function ($annotateButton) {
    if (!keepSelection) {
        highlighter.removeAllHighlights();
    }
    keepSelection = false;
};

// viewer.mouseUp
var viewerMouseUp = function ($annotateButton) {
    var range;
    try {
        range = rangy.getSelection().getRangeAt(0);
    } catch (e) { return false; }

    if (range.startOffset === range.endOffset) {
        $annotateButton.fadeOut(500);
        highlighter.removeAllHighlights();
        return false;
    }

    var hl  = highlighter.highlightSelection('temp-highlight'),
        jhl = $('.temp-highlight');

    var tempOffset = jhl.offset(),
        tempWidth  = jhl.width(),
        tempHeight = jhl.height();
    $annotateButton.css({
        top: tempOffset.top + tempHeight + 10,
        left: $viewer.position().left + 20
    });
    $annotateButton.fadeIn(500);

    return false;
};

// body.mouseUp
/*
 * var bodyMouseUp = function (event) {
 *     if (!keepSelection) {
 *         if ($annotateButton) {
 *             $annotateButton.fadeOut(500);
 *         }
 *         highlighter.removeAllHighlights();
 *     }
 * };
 */
