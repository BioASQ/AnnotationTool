require(['app', 'editQuestionTitle'], function (app, EditQuestionWidget) {
    if ((typeof Array.prototype.filter === 'undefined') ||
        (typeof Array.prototype.map === 'undefined') ||
        (typeof Array.prototype.forEach === 'undefined')) {
        alert('This browser is too old and not supported. Please update your browser.');
        return;
    }
    
    // cache pointers to DOM
    var $saveButton = $('#saveButton'),
        $finalizeButton = $('#finalize-button'),
        $questionAnswer = $('#questionAnswer'),
        $answerSpace = $('#answerSpace'),
        $questionTitle = $('#questionTitle'),
        $snippetsList = $('#snippetsList');

    // annotation btns
    var $startAnn = $('#startAnn'),
        $annDoc = $('#annDoc'),
        $annotateButton = $('#annotate-button'),
        $annCancel = $('#annCancel');

    // get view contatiner
    $viewer = $('#viewer');

    // define data stuctures
    var lastAnnotationID = 0,
        currentAnnotation = null,
        currentDocument = null;

    var tempClassApplier = rangy.createCssClassApplier('temp-highlight'),
        highlighter      = rangy.createHighlighter();
    highlighter.addClassApplier(tempClassApplier);

    var resultTemplate = Handlebars.compile($('#resultTemplate').html());

    var idealAnswerTemplate = Handlebars.compile($('#idealAnswerTemplate').html());
    var exactAnswerTemplate = Handlebars.compile($('#exactAnswerTemplate').html());
    var systemResponsesTemplate = Handlebars.compile($('#systemResponsesTemplate').html());

    // docs template
    var source = $('#documentTemplate').html(),
        docTemplate = Handlebars.compile(source);

    // annotation highlight tempalte
    source = $('#annotationTemplate').html();
    var annTemplate = Handlebars.compile(source);

    // annotation highlight tempalte
    var annotationTemplate = Handlebars.compile($('#annotationTemplate2').html());

    // snippet template
    source = $('#snippetTemplate').html();
    var snipTemplate = Handlebars.compile(source);

    var currentSelectionRange = null;

    var tagsToEscape = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;'
    };
    var escapeTag = function (tag) {
        return tagsToEscape[tag] || tag;
    };
    var safeTagsReplace = function (str) {
        return str.replace(/[&<>]/gi, escapeTag);
    };
    var safeTagsUnescape = function (str) {
        return $('<div/>').html(str).text();
    };
    var quoteRegex = function (str) {
        return (str + '').replace(/([.?*+^$[\]\\() {}|-])/g, '\\$1');
    };
    var getSelectionHtml = function () {
        var html = '';
        if (typeof window.getSelection != 'undefined') {
            var sel = window.getSelection();
            if (sel.rangeCount) {
                var container = document.createElement('div');
                for (var i = 0, len = sel.rangeCount; i < len; ++i) {
                    container.appendChild(sel.getRangeAt(i).cloneContents());
                }
                html = container.innerHTML;
            }
        } else if (typeof document.selection != 'undefined') {
            if (document.selection.type == 'Text') {
                html = document.selection.createRange().htmlText;
            }
        }

        return html;
    };

    var renderAnswer = function (question) {
        $('#questionType').select(question.type);

        var dimensions = [{
                name: 'recall',
                label: 'Information recall',
                info: 'All the necessary information is reported.'
            }, {
                name: 'precision',
                label: 'Information precision',
                info: 'No irrelevant information is reported.'
            }, {
                name: 'repetition',
                label: 'Information repetition',
                info: 'The answer does not repeat the same information multiple times.'
            }, {
                name: 'readability',
                label: 'Readability',
                info: 'The answer is easily readable and fluent.'
            }
        ];

        var dimensionValues = [1, 2, 3, 4, 5];

        var dimensionData = [];
        for (var idealAnswerIndex = 0; idealAnswerIndex < answer.ideal.length; idealAnswerIndex++) {
            var answerDimensions = {
                answer: answer.ideal[idealAnswerIndex].body,
                isGolden: answer.ideal[idealAnswerIndex].golden === true,
                dimensions: []
            };
            for (var dimensionIndex = 0; dimensionIndex < dimensions.length; dimensionIndex++) {
                var dimension = {
                    name:   dimensions[dimensionIndex].name,
                    label:  dimensions[dimensionIndex].label,
                    info:   dimensions[dimensionIndex].info,
                    values: []
                };
                for (var k = 0; k < dimensionValues.length; k++) {
                    var selected = false;
                    if (answer.ideal[idealAnswerIndex].scores &&
                        answer.ideal[idealAnswerIndex].scores[dimension.name] === dimensionValues[k]) {
                        
                        selected = true;
                    }
                    dimension.values.push({
                        value: dimensionValues[k],
                        selected: selected
                    });
                }
                answerDimensions.dimensions.push(dimension);
            }
            dimensionData.push(answerDimensions);
        }

        $('#idealAnswer').html(idealAnswerTemplate({
            dimensionData: dimensionData,
            dimensionValues: dimensionValues
        }));

        var templateData = {};
        switch (question.type) {
        case 'decisive':
            templateData.isDecisive = true;
            templateData.exactValue = (question.answer.exact.substr(0, 3).toLowerCase() === 'yes');
            break;
        case 'factoid':
            templateData.isFactoid = true;
            break;
        case 'list':
            templateData.isList = true;
            break;
        }

        $('#exactAnswer').html(exactAnswerTemplate($.extend({}, question.answer, templateData)));

        $('label').tooltip();
    };

    var renderSystemResponses = function (question) {
        var responses = [];
        if (typeof question.answer.systemResponses !== 'undefined') {
            question.answer.systemResponses.forEach(function (response) {
                var templateData = {};
                switch (question.type) {
                case 'decisive':
                    templateData.isDecisive = true;
                    templateData.response = response;
                    break;
                case 'factoid':
                    templateData.isFactoid = true;
                    templateData.response = response.join(', ');
                    break;
                case 'list':
                    templateData.isList = true;
                    templateData.response = response.map(function (item) {
                        return item.join(', ');
                    });
                    break;
                }
                responses.push($.extend({}, response, templateData));
            });
        }
        $('#system-responses').html(systemResponsesTemplate({'responses': responses}));
    };

    $('.idealAnswer').live('change', function () {
        var idealAnswerIndex = parseInt($(this).closest('form').data('answer'), 10);
        answer.ideal[idealAnswerIndex].body = $(this).val();
    });

    $('input.ideal-score').live('click', function () {
        var dimension = $(this).attr('name'),
            idealAnswerIndex = parseInt($(this).closest('form').data('answer'), 10),
            value = parseInt($(this).val(), 10);

        answer.ideal[idealAnswerIndex].scores = answer.ideal[idealAnswerIndex].scores || {};
        answer.ideal[idealAnswerIndex].scores[dimension] = value;
        app.data.question.answer = answer;
        app.save();
    });

    var updateExactAnswer = function () {
        switch (app.data.question.type) {
        case 'decisive':
            answer.exact = $('input[name="exactAnswer"]:checked').val();
            break;
        case 'factoid':
            var synonymList = [];
            $('input[name="exactAnswer"]').each(function (item) {
                var jel = $(this),
                    synonymIndex = parseInt(jel.data('synonymId'), 10),
                    val = jel.val().trim();

                if (val) {
                    synonymList[synonymIndex] = val;
                }
            });
            answer.exact = synonymList.filter(function (item) { return item !== null; });

            $('#exactAnswer').html(exactAnswerTemplate($.extend({}, answer, { isFactoid: true })));

            break;
        case 'list':
            var list = [];
            $('input[name="exactAnswer"]').each(function (item) {
                var jel = $(this),
                    itemIndex = parseInt(jel.closest('li').data('itemId'), 10),
                    synonymIndex = parseInt(jel.data('synonymId'), 10),
                    val = jel.val().trim();

                if (val) {
                    list[itemIndex] = list[itemIndex] || [];
                    list[itemIndex][synonymIndex] = val;
                }

            });

            list.forEach(function (synonymList, i) {
                list[i] = synonymList.filter(function (item) { return item !== null; });
            });

            answer.exact = list.filter(function (synonymList) { return synonymList.length > 0; });

            $('#exactAnswer').html(exactAnswerTemplate($.extend({}, answer, { isList: true })));

            break;
        }
        app.data.question.answer = answer;
        app.save();
    };

    $('input[name="exactAnswer"]').live('blur', function () {
        updateExactAnswer();
    });

    $('input[name="exactAnswer"]').live('change', function () {
        updateExactAnswer();
    });

    $('.modify-golden').live('click', function () {
        var jel = $(this),
            id = jel.data('num');
        for (var i = 0; i < answer.annotations.length; i++) {
            var itemID = answer.annotations[i].localID;

            if (itemID === id) {
                if (jel.hasClass('add-golden')) {
                    answer.annotations[i].golden = true;
                    jel.removeClass('add-golden').addClass('remove-golden');
                    jel.children('i').removeClass('icon-plus-sign').addClass('icon-minus-sign');
                    jel.parents('tr').addClass('golden');
                } else {
                    answer.annotations[i].golden = false;
                    jel.removeClass('remove-golden').addClass('add-golden');
                    jel.children('i').removeClass('icon-minus-sign').addClass('icon-plus-sign');
                    jel.parents('tr').removeClass('golden');
                }
                break;
            }
        }
        app.data.question.answer = answer;
        app.save();

        renderCurrentDocument();
    });

    $('.modify-ideal').live('click', function () {
        var jel = $(this),
            index = parseInt(jel.data('id'), 10);
        if (jel.hasClass('add-golden')) {
            answer.ideal[index].golden = true;
            jel.removeClass('add-golden').addClass('remove-golden');
            jel.children('i').removeClass('icon-plus-sign').addClass('icon-minus-sign');
            jel.closest('.row').addClass('golden');
        } else {
            answer.ideal[index].golden = false;
            jel.removeClass('remove-golden').addClass('add-golden');
            jel.children('i').removeClass('icon-minus-sign').addClass('icon-plus-sign');
            jel.closest('.row').removeClass('golden');
        }
    });

    $('.expand-horizontally').live('click', function () {
        var jel = $(this);

        if (app.data.question.type === 'factoid') {
            answer.exact.push('');
            $('#exactAnswer').html(exactAnswerTemplate($.extend({}, answer, { isFactoid: true })));
        } else if (app.data.question.type === 'list') {
            var itemIndex = parseInt(jel.closest('li').data('itemId'), 10);
            answer.exact[itemIndex].push('');
            $('#exactAnswer').html(exactAnswerTemplate($.extend({}, answer, { isList: true })));
        }
    });

    $('.expand-vertically').live('click', function () {
        var jel = $(this);

            answer.exact.push(['']);

            $('#exactAnswer').html(exactAnswerTemplate($.extend({}, answer, { isList: true })));
    });

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

    var sectionConfig = {};

    $('.previous-snippet').live('click', function () {
        var jel = $(this),
            sectionName = jel.data('sectionName'),
            sectionIndex = parseInt(jel.data('sectionId'), 10);

            if (sectionConfig[sectionName].currentSnippet === 0) {
                sectionConfig[sectionName].currentSnippet = (sectionConfig[sectionName].numberOfSnippets - 1);
            } else {
                sectionConfig[sectionName].currentSnippet = sectionConfig[sectionName].currentSnippet - 1;
            }

            renderCurrentDocument();
    });

    $('.next-snippet').live('click', function () {
        var jel = $(this),
            sectionName = jel.data('sectionName'),
            sectionIndex = parseInt(jel.data('sectionId'), 10);

            if (sectionConfig[sectionName].currentSnippet ===
                (sectionConfig[sectionName].numberOfSnippets - 1)) {
                sectionConfig[sectionName].currentSnippet = 0;
            } else {
                sectionConfig[sectionName].currentSnippet = sectionConfig[sectionName].currentSnippet + 1;
            }

            renderCurrentDocument();
    });

    var highlightSnippetsInSection = function (document, section, sectionName, allowOverlaps) {
        var hasMultipleSnippets = false;
        var orderedSnippets = answer.annotations.filter(function (annotation) {
            return (annotation.type === 'snippet' &&
                    annotation.document === document.uri &&
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
        orderedSnippets
            .forEach(function (snippetAnnotation, snippetIndex) {
            var highlighted = annotationTemplate({
                text: snippetAnnotation.text,
                id: snippetAnnotation.localID,
                classes: snippetAnnotation.golden ? 'annotation golden': 'annotation'
            });

            section = section.substring(0, snippetAnnotation.beginIndex)
                    + highlighted
                    + section.substring(snippetAnnotation.endIndex);
        });

        return { hasMultipleSnippets: hasMultipleSnippets, text: section };
    };

    var renderSnippets = function (document, allowOverlaps) {
        var renderSections = document.sections.map(function (section, sectionIndex) {
            var sectionName = 'sections.' + sectionIndex;
            return highlightSnippetsInSection(document, section, sectionName, allowOverlaps);
        });

        var titleData = highlightSnippetsInSection(document, document.title, 'title', allowOverlaps);

        $viewer.html(docTemplate({ title: titleData, sections: renderSections }));
    };

    var renderCurrentDocument = function () {
        if (currentDocument) {
            var scroll = $(document).scrollTop();

            // render body
            if (currentDocument.type == 'document') {
                renderSnippets(currentDocument, true);
            }

            // render annotations list
            renderAnnotationsList();

            window.setTimeout(function () {
                $(document).scrollTop(scroll);
            });
        }
    };

    var renderAnnotationsList = function () {
        var html = '';
        for (var i = 0; i < answer.annotations.length; i++) {
            if (answer.annotations[i].type === 'snippet') {
                html += snipTemplate({
                    assessmentMode: window.shared.shared.mode === window.shared.shared.MODE_ASSESSMENT,
                    text: answer.annotations[i].text,
                    id: answer.annotations[i].localID,
                    isGolden: answer.annotations[i].golden
                });
            }
        }
        $snippetsList.html(html);
    };

    // restore answer
    if (app.data.question.answer !== null && typeof app.data.question.answer != 'undefined') {
        // get answer
        answer = app.data.question.answer;
        // app.save();

        // Assign local annotation IDs
        for (i = 0; i < answer.annotations.length; i++) {
            answer.annotations[i].localID = i;
        }

        lastAnnotationID = answer.annotations[answer.annotations.length - 1].localID;

        // render annotations
        renderAnnotationsList();

        if (app.data.question.finalized) {
            $finalizeButton.addClass('active');
            $('.is-finalized').show();
        }
    }

    renderSystemResponses(app.data.question);

    // init edit question title widget
    var eqtW = new EditQuestionWidget(app);

    // set question text
    $questionTitle.text(app.data.question.body);
    $questionTitle.attr('data-original-title', app.data.question.body);
    $questionTitle.tooltip();

    //
    var updateQuestionText = function () {
        $answerSpace.html(answer.html);
    };

    var prepareAnnotation = function () {
        answer.text = $questionAnswer.val();
        var text = getSelectionHtml();

        var begin = answer.text.indexOf(text);
        if (begin != -1) {
            var id = ++lastAnnotationID;
            answer.annotations.push({
                'beginIndex': begin,
                'length': text.length,
                'text': text,
                'id': id,
                'html': '<span style="background-color: #fff000;">' + text + '</span>'
            });
            currentAnnotation = answer.annotations[answer.annotations.length-1];

            // render
            // answer.html = answer.html.replace(text, currentAnnotation.html);
            // updateQuestionText();

            // show buttons
            // $startAnn.hide();
            // $annCancel.show();
            // $annDoc.show();
            // $annTxt.show();
        }
    };

    // event for freezing answer
    /*$('#freezeButton').on('click', function () {
        // swap buttons
        $(this).hide();
        $saveButton.show();
        $startAnn.show();

        // get text
        answer.text = answer.html = $questionAnswer.val();

        // draw text as static
        $questionAnswer.hide();
        $answerSpace.show();

        // update text
        updateQuestionText();

        return false;
    });*/

    // update local question text when user stops typing in input
    var typingTimeout = -1;
    $questionAnswer.keydown(function() {
        if (typingTimeout != -1) {
            window.clearTimeout(typingTimeout);
            typingTimeout = -1;
        }
    }).keyup(function() {
        if (typingTimeout == -1) {
            typingTimeout = window.setTimeout(function() {
                // clear timeout id
                typingTimeout = -1;

                // save
                answer.text = $questionAnswer.val();
                app.data.question.answer = answer;
                app.save();
            }, 1000);
        }
    });

    // starting annotation
    $startAnn.on('click', prepareAnnotation);

    $annCancel.on('click', function () {
        // revert
        // answer.html = answer.html.replace(currentAnnotation.html, currentAnnotation.text);
        // updateQuestionText();

        // remove annotation
        answer.annotations.pop();

        // show buttons
        $startAnn.show();
        $annCancel.hide();
        $annDoc.hide();
        $annTxt.hide();
    });

    $annDoc.on('click', function () {
        if (typeof currentDocument == 'undefined' || currentDocument === null) {
            alert('No document selected!');
            return;
        }

        // prepare new annotation
        prepareAnnotation();

        // update view
        // var oldHtml = currentAnnotation.html;
        // TODO: randomly generate color
        // currentAnnotation.html = currentAnnotation.html.replace('#fff000', '#ff0000');
        // answer.html = answer.html.replace(oldHtml, currentAnnotation.html);
        // updateQuestionText();

        // add doc data to annotation
        currentAnnotation['document'] = currentDocument.uri;
        currentAnnotation['annotationText'] = null;

        // store current annotation
        app.data.question.answer = answer;
        app.save();

        // show buttons
        // $startAnn.show();
        // $annCancel.hide();
        // $annDoc.hide();
        // $annTxt.hide();
    });

    var doesSnippetOverlapWithSnippets = function (snippet, snippets) {
        return snippets.some(function (s) {
            try {
                compareSnippets(snippet, s);
            } catch (e) {
                return true;
            }
        });
    };

    var keepSelection = false;
    $annotateButton.mousedown(function (event) {
        keepSelection = true;
    });

    $annotateButton.click(function () {
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

        if (typeof startSectionName !== 'undefined' && typeof endSectionName !== 'undefined') {
            var cRange = range.toCharacterRange($(range.startContainer).closest('.section').get(0)),
                newSnippet = {
                type: 'snippet',
                beginSection: startSectionName,
                endSection: endSectionName,
                beginIndex: cRange.start,
                endIndex: cRange.start + String(range).length,
                text: String(range),
                document: currentDocument.uri,
                golden: true,
                localID: ++lastAnnotationID
            };

            if (doesSnippetOverlapWithSnippets(newSnippet, answer.annotations.filter(function (s) {
                return (s.type === 'snippet' &&
                        s.document === currentDocument.uri &&
                        s.beginSection === startSectionName);
            }))) {
                alert('Snippets cannot overlap!');
                selection.removeAllRanges();
                return;
            } else {
                answer.annotations.push(newSnippet);

                if (typeof sectionConfig[startSectionName] !== 'undefined') {
                    sectionConfig[startSectionName].numberOfSnippets++;
                    // select last (just added) snippet
                    sectionConfig[startSectionName].currentSnippet =
                        (sectionConfig[startSectionName].numberOfSnippets - 1);
                }

                renderSnippets(currentDocument, true);
                renderAnnotationsList();
            }

            app.data.question.answer = answer;
            app.save();
        }

        $annotateButton.fadeOut(500);
        highlighter.removeAllHighlights();

        return false;
    });

    $viewer.mousedown(function (event) {
        if (!keepSelection) {
            highlighter.removeAllHighlights();
        }
        keepSelection = false;
    });

    $viewer.mouseup(function () {
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
            left: $viewer.position().left + 10
        });
        $annotateButton.fadeIn(500);

        return false;
    });

    $('body').mouseup(function (event) {
        if (!keepSelection) {
            $annotateButton.fadeOut(500);
            highlighter.removeAllHighlights();
        }
    });

    renderAnswer(app.data.question);

    $finalizeButton.on('click', function () {
        var jel = $(this);

        if (jel.hasClass('active')) {
            app.data.question.finalized = false;
        } else {
            app.data.question.finalized = true;
        }

        app.save();

        $.ajax({
            url: app.data.LogicServer + 'questions/' + app.data.question._id,
            contentType: 'application/json',
            dataType: 'json',
            data: JSON.stringify({ finalized: app.data.question.finalized }),
            type: 'POST',
            success: function (data) {
                if (app.data.question.finalized) {
                    jel.text('Unfinalize Question');
                    $('.is-finalized').fadeIn(250);
                } else {
                    jel.text('Finalize Question');
                    $('.is-finalized').fadeOut(250);
                }
            },
            error: function (XHR, textStatus, error) {
                alert('Something went wrong (' + textStatus + ')');
            }
        });
    });

    $saveButton.on('click', function () {
        updateExactAnswer();
        var question = app.data.question;
        question.answer = answer;
        // app.save();
        // post
        $.ajax({
            url: app.data.LogicServer + 'questions/' + question._id,
            contentType: 'application/json',
            dataType: 'json',
            data: JSON.stringify(question),
            type: 'POST',
            success: function(data) {
                $('#saveSuccess').show();
            },
            error: function() {
                $('#saveError').show();
            }
        });

        return false;
    });

    // on result docs click
    $('.result-row td a').live('click', function () {
        // get pdf url
        if ($(this).hasClass('document')) {
            var num = $(this).data('num');

            // set current doc
            var i;
            for (i = 0; i < answer.annotations.length; i++) {
                if (answer.annotations[i].localID === num) {
                    currentDocument = answer.annotations[i];
                    break;
                }
            }

            // render content
            renderCurrentDocument();

            return false;
        } else {
            $viewer.html('');
        }
    });

    // Delete annotation
    $('.annotationText').live('click', function () {
        var id = $(this).data('id'),
            i, ann;

        for (i = 0; i < answer.annotations.length; i++) {
            if (answer.annotations[i].localID == id) {
                ann = answer.annotations[i];
                break;
            }
        }

        // remove from array
        answer.annotations.splice(i, 1);
        
        if (typeof sectionConfig[ann.beginSection] !== 'undefined') {
            sectionConfig[ann.beginSection].currentSnippet = 0;
            sectionConfig[ann.beginSection].numberOfSnippets =
                Math.max(0, sectionConfig[ann.beginSection].numberOfSnippets - 1);
        }

        app.data.question.answer = answer;
        app.save();

        // re-render
        renderCurrentDocument();
        renderAnnotationsList();
    });

    var getRelatedSnippets = function (document) {
        return answer.annotations.filter(function (item) {
            return (item.type === 'snippet' && item.document === document.uri);
        });
    };

    $('.removeFromResults').live('click', function () {
        var that = $(this),
            num = that.data('num');

        // remove from storage
        for (var i = 0; i < answer.annotations.length; i++) {
            if (answer.annotations[i].localID == num) {
                if (answer.annotations[i].type === 'document') {
                    var relatedSnippets = getRelatedSnippets(answer.annotations[i]);
                    if (relatedSnippets.length) {
                        alert('There are ' + relatedSnippets.length + ' snippets associated with this document. Please delete those snippets first.');
                        return;
                    }
                }
                answer.annotations.splice(i, 1);
                break;
            }
        }

        app.data.question.answer = answer;
        app.save();

        that.parent().parent().remove();
    });

    // escape html
    /*
     * for (var i = 0, len = answer.annotations.length; i < len; i++) {
     *     if (answer.annotations[i].type == 'document') {
     *         for (var j = 0, jlen = answer.annotations[i].sections.length; j < jlen; j++) {
     *             // Fix broken documents with `null` section
     *             if (!answer.annotations[i].sections[j]) {
     *                 continue;
     *             }
     *             // Don't doubly escape annotations
     *             if (answer.annotations[i].sections[j].indexOf('Remove annotation') == -1) {
     *                 answer.annotations[i].sections[j] = safeTagsReplace(answer.annotations[i].sections[j]);
     *             }
     *         }
     *     }
     * }
     */

    // render docs
    // render to string
    var html = '';
    for (var i = 0; i < answer.annotations.length; i++) {
        if (answer.annotations[i].type !== 'snippet') {
            var type = answer.annotations[i].type.charAt(0).toUpperCase();

            html += resultTemplate($.extend({}, answer.annotations[i], {
                type: type,
                class: answer.annotations[i].type,
                assessmentMode: window.shared.shared.mode === window.shared.shared.MODE_ASSESSMENT,
                isGolden: answer.annotations[i].golden
            }));
        }
    }

    // append to dom
    $('#resultList').html(html);

    $('tr.result-row').tooltip();

    /*
     * $annotateButton.affix({
     *     offset: {
     *         top: $annotateButton.offset().top - $('.navbar-fixed-top').first().height()
     *     }
     * });
     * $annotateButton.parent().css('height', $annotateButton.parent().height());
     */

    // sort result list
    var sort = true;
    var asc = false;
    $('body').on('click', '#dataType', function () {
        if (sort) {
            asc = !asc;
            asc ?  $('#dataType').html('<i class="icon-arrow-down"></i>')
                : $('#dataType').html('<i class="icon-arrow-up"></i>');

            $('tr.result-row').tooltip('destroy');

            // bubble sort
            var n = $('tr.result-row').length;
            do {
                var rep = 0;
                for (var index = 0 ; index < n; index++) {
                    var element = $('tr.result-row')[index];
                    var next = $(element).next();
                    if (!asc) {
                        var tmp = element;
                        element = next;
                        next = tmp;
                    }
                    if ($(element).attr('data-type') > $(next).attr('data-type')) {
                        $(element).replaceWith($(next).after($(element).clone(true, true)));

                        rep = index;
                    }
                }
                n = rep;
            } while (n != 0);
            sort = false;
        } else {
            $('#resultList').html(html);
            $('#dataType').html('<i class="icon-resize-vertical"></i>');
            sort = true;
        }
        $('tr.result-row').tooltip();
    });

    if (window.shared.shared.mode === window.shared.shared.MODE_ASSESSMENT) {
        $('<th style="width:2em">Gold</th>').insertAfter('#annotations-table thead tr th:nth-child(2)');
    }
});
