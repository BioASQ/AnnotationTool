require(["app", "editQuestionTitle", "spinner"], function (app, EditQuestionWidget) {
    // compiled templates
    var searchResultTemplate          = Handlebars.compile($("#searchResultTemplate").html()),
        searchResultConceptTemplate   = Handlebars.compile($("#searchResultConceptTemplate").html()),
        sourceSelectionTemplate       = Handlebars.compile($("#sourceSelectionTemplate").html()),
        statementSearchResultTemplate = Handlebars.compile($("#statementSearchResultTemplate").html()),
        answerTemplate                = Handlebars.compile($("#answerTemplate").html()),
        paginationTemplate            = Handlebars.compile($("#paginationTemplate").html()),
        documentExtensionTemplate     = Handlebars.compile($("#extendedDocumentResultTemplate").html());
        statementExtensionTemplate    = Handlebars.compile($("#extendedStatementResultTemplate").html());

    // cached dom pointers
    var questionTitle      = $("#questionTitle"),
        searchResults      = $("#searchResults"),
        answerList         = $("#results"),
        searchQuery        = $("#searchQuery"),
        conceptsResult     = $("#conceptsResult"),
        conceptProgress    = $("#conceptProgress"),
        conceptsHeader     = $("#conceptsResult .result-header"),
        docsResult         = $("#documentsResult"),
        documentsProgress  = $("#documentsProgress"),
        documentsHeader    = $("#documentsResult .result-header"),
        statementsProgress = $("#statementsProgress"),
        statementsResult   = $("#statementsResult"),
        statementsHeader   = $("#statementsResult .result-header");

    // other vars
    var source, currentQuery, conceptResults = [], filteredConcepts = [];

    var results = {
        'concepts': [],
        'documents': [],
        'statements': []
    };

    // ongoing ajax requests
    var conceptsRequest = null,
        documentsRequest = null,
        statementsRequest = null;

    // pagination constants
    var itemsPerPage = 10;

    var currentDocumentsPage = 1,
        totalDocumentPages;

    var currentConceptsPage = 1,
        totalConceptsPages,
        availableSources = [
            { name: 'Disease Ontology', active: true },
            { name: 'Gene Ontology',    active: true },
            { name: 'Jochem',           active: true },
            { name: 'MeSH',             active: true },
            { name: 'UniProt',          active: true }
        ];

    // init edit question title widget
    var eqtW = new EditQuestionWidget(app);

    // set title
    questionTitle.text(app.data.question.body);
    questionTitle.attr('data-original-title', app.data.question.body);
    questionTitle.tooltip();

    ////////////////////////////////////////////////////////////////////////////
    // Event handlers
    ////////////////////////////////////////////////////////////////////////////

    // bind search
    $("#searchButton").click(function () {
        var query = searchQuery.val();
        // searchQuery.val("");
        currentQuery = query;

        // reset toggles
        var tc = $("#toggleConcepts");
        if( tc.data('state') !== "hidden" )
            toggleClass("conceptResult", tc);

        var td = $("#toggleDocs");
        if( td.data('state') !== "hidden" )
            toggleClass("documentResult", td);

        var ts = $("#toggleStatments");
        if( ts.data('state') !== "hidden" )
            toggleClass("statementResult", ts);

        // clean old
        $('.conceptResult').remove();
        $('.documentResult').remove();
        $('.statementResult').remove();

        if (conceptsRequest !== null)   { conceptsRequest.abort(); }
        if (documentsRequest !== null)  { documentsRequest.abort(); }
        if (statementsRequest !== null) { statementsRequest.abort(); }

        conceptsResult.hide();
        docsResult.hide();
        statementsResult.hide();

        // show concept spinner
        conceptProgress.parent().show();
        // reset concept search
        conceptResults = [];
        currentConceptsPage = 1;
        availableSources.forEach(function (sourceDescription) {
            sourceDescription.active = true;
        });
        // do concept request
        conceptSearch(query, currentConceptsPage, function (result) {
            conceptProgress.parent().hide();
            conceptsHeader.html(conceptsHeader.data('name') + ' (' + filteredConcepts .length + ')');
            if (result.length) {
                var sourceSelectionHTML = sourceSelectionTemplate({
                    sources: availableSources,
                    rclass: 'conceptResult'
                });
                $('#concepts-results-container').append(sourceSelectionHTML);

                // append to dom
                $('#concepts-results-container').append(result);

                if (totalConceptsPages > 1) {
                    // Concept pagination
                    var pages = {
                        pages: getPages(totalConceptsPages, currentConceptsPage),
                        rclass:'conceptResult',
                        current: currentConceptsPage
                    };
                    var paginationHTML = paginationTemplate(pages);
                    $('#concepts-results-container').append(paginationHTML);
                }
            }
        });

        // show concept spinner
        documentsProgress.parent().show();
        // reset documents pager
        currentDocumentsPage = 1;
        // do document request
        documentSearch(query, currentDocumentsPage, function (result) {
            documentsProgress.parent().hide();
            if (totalDocumentPages > 1) {
                // Document pagination
                var pages = {
                    pages: getPages(totalDocumentPages, currentDocumentsPage),
                    rclass:'documentResult',
                    current: currentDocumentsPage
                };
                var paginationHTML = paginationTemplate(pages);
                $(paginationHTML).insertAfter(docsResult);
            }

            // append to dom
            $(result).insertAfter(docsResult);
        });

        // show concept spinner
        // statementsProgress.parent().show();
        // do statement request
/*
 *         statementsRequest = $.post(app.data.LogicServer + 'statements', { query: query }, function (data) {
 *             statementsRequest = null;
 *             statementsProgress.parent().hide();
 *             var size = data.results.statements.length || 0;
 *             statementsHeader.html(statementsHeader.data('name') + ' (' + size + ')');
 * 
 *             results.statements = [];
 *             statementsResult.show();
 * 
 *             // show statements
 *             if (data.results.statements.length) {
 *                 var html = renderResults(data.results.statements,
 *                                          statementSearchResultTemplate,
 *                                          'statementResult',
 *                                          'statements');
 *                 // append to dom
 *                 $(html).insertAfter(statementsResult);
 *             }
 *         }).error(function () {
 *             statementsRequest = null;
 *             statementsProgress.parent().hide();
 *             statementsResult.show();
 *             statementsHeader.html('Search for statements failed.');
 *         });
 */
    });

    $('.pagination.conceptResult a').live('click', function () {
        if ($(this).parent('li').is('.disabled')) { return false; }
        var newPage = getNewPage(this, currentConceptsPage, totalConceptsPages);
        if (newPage == currentConceptsPage) { return false; }
        $('.conceptResult').remove();

        conceptSearch(currentQuery, newPage, function (result) {
            var sourceSelectionHTML = sourceSelectionTemplate({
                sources: availableSources,
                rclass: 'conceptResult'
            });
            $('#concepts-results-container').append(sourceSelectionHTML);

            $('#concepts-results-container').append(result);
            var pages = {
                pages: getPages(totalConceptsPages, currentConceptsPage),
                rclass:'conceptResult',
                current: currentConceptsPage
            };
            var paginationHTML = paginationTemplate(pages);
            $('#concepts-results-container').append(paginationHTML);

            $("#toggleConcepts").click().click();
        });
    });

    $('.pagination.documentResult a').live('click', function () {
        if ($(this).parent('li').is('.disabled')) { return false; }
        var newPage = getNewPage(this, currentDocumentsPage, totalDocumentPages);
        if (newPage == currentDocumentsPage) { return false; }
        $('.documentResult').remove();

        documentSearch(currentQuery, newPage, function (result) {
            var pages = {
                pages: getPages(totalDocumentPages, currentDocumentsPage),
                rclass:'documentResult',
                current: currentDocumentsPage
            };
            var paginationHTML = paginationTemplate(pages);
            $(paginationHTML).insertAfter(docsResult);

            $(result).insertAfter(docsResult);
            $("#toggleDocs").click().click();
        });
    });

    $('#toggleConcepts').click(function ()  { toggleClass('conceptResult', $(this)); });
    $('#toggleDocs').click(function ()      { toggleClass('documentResult', $(this)); });
    $('#toggleStatments').click(function () { toggleClass('statementResult', $(this)); });

    $('.source-toggle').live('click', function () {
        var toggledSource = $(this).html();
        for (var i = 0; i < availableSources.length; i++) {
            if (availableSources[i].name == toggledSource) {
                availableSources[i].active = !availableSources[i].active;
                break;
            }
        }
        var sources = availableSources
                .filter(function (source) { return source.active; })
                .map(function (source) { return source.name; });

        filteredConcepts = filterConcepts(sources);
        currentConceptsPage = 1;
        totalConceptsPages  = Math.ceil(filteredConcepts.length / itemsPerPage);

        conceptsHeader.html(conceptsHeader.data('name') + ' (' + filteredConcepts .length + ')');

        $('.conceptResult').remove();
        showConcepts(currentConceptsPage, function (html) {
            var sourceSelectionHTML = sourceSelectionTemplate({
                sources: availableSources,
                rclass: 'conceptResult'
            });
            $('#concepts-results-container').append(sourceSelectionHTML);

            $('#concepts-results-container').append(html);
            var pages = {
                pages: getPages(totalConceptsPages, currentConceptsPage),
                rclass:'conceptResult',
                current: currentConceptsPage
            };
            var paginationHTML = paginationTemplate(pages);
            $('#concepts-results-container').append(paginationHTML);

            $("#toggleConcepts").click().click();
        });
    });

    // bind add-remove stuff
    $('.addremove').live('click', function () {
        var id = $(this).data('id'),
            sectionName = id.replace(/-[\d:]+/, ''),
            i;

        var res;
        for (i = 0; i < results[sectionName].length; i++) {
            if (results[sectionName][i]['_internalID'] == id) {
                res = results[sectionName][i];
                break;
            }
        }

        if (res) {
            if (isSelected(res)) {
                // remove from entities
                for (i = 0; i < app.data.question.entities.length; i++) {
                    var current = app.data.question.entities[i];
                    if (equal(current, res)) {
                        app.data.question.entities.splice(i, 1);
                    }
                }
                $(this).children('.icon-minus').removeClass('icon-minus').addClass('icon-plus');
            } else {
                // append to entities
                app.data.question.entities.push(res);
                $(this).children('.icon-plus').removeClass('icon-plus').addClass('icon-minus');
            }
            // save result
            app.save();
        }

        // re-render
        renderSelection();
    });

    // on done
    $('#doneButton').click(function () {
        app.save();
        // post
        $.ajax({
            url: app.data.LogicServer+"questions/"+app.data.question._id,
            contentType: "application/json",
            dataType: "json",
            data: JSON.stringify(app.data.question),
            type: "POST",
            success: function(data){
                window.location = 'answerQuestion.html';
            },
            error: function(){
                alert("Something went wrong");
            }
        });

    });

    $('.more-info').live('click', function () {
        if (!$(this).parent().siblings('.search-result-info').length) {
            var id = $(this).parents('.search-result').data('id'),
                index = id.replace(/\D+/,''),
                sectionName = id.replace(/-[\d:]+/, '');

            var doc = results[sectionName][index];
            var html;
            if (sectionName == 'documents') {
                html = documentExtensionTemplate(doc);
            } else {
                html = statementExtensionTemplate(doc);
            }
            $(this).parents('.search-result').append($(html));
            return;
        }

        var info = $(this).parent().siblings('.search-result-info');
        if (info.is(':visible')) {
            info.hide();
        } else {
            info.show();
        }
    });

    ////////////////////////////////////////////////////////////////////////////
    // Function definitions
    ////////////////////////////////////////////////////////////////////////////

    // Renders previously selected results into dropdown box
    var renderSelection = function () {
        if( app.data.question.entities === null || typeof app.data.question.entities == 'undefined' ){
            app.data.question.entities = [];
        }

        var i, res, html = '';
        for (i = 0; i < app.data.question.entities.length; i++) {
            res = app.data.question.entities[i];

            // render to string
            html += answerTemplate(res);
        }

        answerList.html(html);
    };

    // bind toggle button
    var toggleClass = function (cls, elm) {
        var show, state, c;

        state = elm.data('state');
        if (state == 'hidden') {
            elm.text('Collapse');
            elm.data('state', 'visible');
            show = true;
        } else {
            elm.text('Expand');
            elm.data('state', 'hidden');
            show = false;
        }

        c = $('.' + cls);
        if (show) {
            c.show();
        } else {
            c.hide();
        }
    };

    var conceptSearch = function (query, page, cb) {
        if (page == 1 && !conceptResults.length) {
            fetchConcepts(query, page, function (concepts) {
                conceptResults = concepts;
                filteredConcepts = conceptResults;
                currentConceptsPage = 1;
                totalConceptsPages = Math.ceil(filteredConcepts.length / itemsPerPage);
                showConcepts(1, cb);
            });
        } else {
            currentConceptsPage = page;
            showConcepts(page, cb);
        }
    };

    var fetchConcepts = function (query, page, cb) {
        conceptsRequest = $.post(app.data.LogicServer + 'concepts', { query: query }, function (data) {
            conceptsRequest = null;
            if (data.results.concepts.length) {
                cb(data.results.concepts);
            } else {
                cb([]);
            }
        }).error(function () {
            conceptsRequest = null;
            conceptProgress.parent().hide();
            conceptsHeader.html('Search for concepts failed.');
        });
    };

    var isSelected = function (item) {
        for (var i = 0; i < app.data.question.entities.length; i++) {
            var current = app.data.question.entities[i];
            if (equal(current, item)) { return true; }
        }
        return false;
    };

    var equal = function (lhs, rhs) {
        // can be concept, document, statement
        if (lhs.uri && rhs.uri) {
            // concepts and documents both have URIs, so used them
            return (lhs.uri == rhs.uri);
        }
        else if (lhs.s && lhs.p && lhs.o && rhs.s && rhs.s && rhs.p && rhs.o) {
            // statements should have s, p, o
            return (lhs.s == rhs.s && lhs.p && rhs.p && lhs.o && rhs.o);
        }
        return false;
    };

    var showConcepts = function (page, cb) {
        conceptsResult.show();
        results.concepts = [];
        var begin = (page - 1) * itemsPerPage,
            // html = renderResults(conceptResults.slice(begin, begin + itemsPerPage),
            html = renderResults(filteredConcepts.slice(begin, begin + itemsPerPage),
                                 searchResultConceptTemplate,
                                 'conceptResult',
                                 'concepts');

        cb(html);
    };

    var filterConcepts = function (sources) {
        return conceptResults.filter(function (result, index) {
            return (sources.indexOf(result.source) > -1);
        });
    };

    var documentSearch = function (query, page, cb) {
        documentsRequest = $.post(app.data.LogicServer + 'documents', { query: query, page: page - 1 }, function (data) {
            documentsRequest = null;
            totalDocumentPages = Math.ceil(data.size / itemsPerPage);
            currentDocumentsPage = data.page + 1;
            documentsHeader.html(documentsHeader.data('name') + ' (' + data.size + ')');

            results.documents = [];
            var html = '';

            // show documents
            if (data.results.documents.length) {
                docsResult.show();
                html = renderResults(data.results.documents,
                                     searchResultTemplate,
                                     'documentResult',
                                     'documents');
            }

            cb(html);
        }).error(function () {
            documentsRequest = null;
            documentsProgress.parent().hide();
            docsResult.show();
            documentsHeader.html('Search for documents failed.');
        });
    };

    var renderResults = function (renderData, template, className, resultSection) {
        var html = '',
            internalID = 0;
        for (var i = 0; i < renderData.length; i++) {
            var current = renderData[i];
            if (typeof current == 'undefined') continue;
            current.domClass = className;
            current['_internalID'] = resultSection + '-' + Date.now() + ':' + internalID++;
            current['renderTitle'] = current['title'];
            current['selected']    = isSelected(current);
            results[resultSection].push(current);

            // render to string
            html += template(current);
        }
        return html;
    };

    // Calculates the new page (incl. edge cases) based on clicked element
    var getNewPage = function (element, currentPage, totalPages) {
        var newPage;
        if ($(element).html() == '...') {
            newPage = currentPage;
        } else if ($(element).hasClass('prev')) {
            newPage = Math.max(1, currentPage - 1);
        } else if ($(element).hasClass('next')) {
            newPage = Math.min(totalPages, currentPage + 1);
        } else {
            newPage = parseInt($(element).html());
        }
        return newPage;
    };

    // Return array with page names
    var getPages = function (total, current) {
        var max         = Math.min(5, total),
            pages       = [];
            displace    = Math.floor(max / 2),
            leftAdjust  = Math.max(1, current - displace),
            rightAdjust = Math.max(0, displace - (total - current));

        if (current - displace - rightAdjust > 1) {
            pages.push({ name: '…', disabled: true });
        }

        for (var i = 0; i < max; i++) {
            var val = i + leftAdjust - rightAdjust;
            pages.push({
                name: String(val),
                active: (val === current)
            });
        }

        if (current + displace + leftAdjust + 1 < total) {
            pages.push({ name: '…', disabled: true });
        }

        return pages;
    };

    ////////////////////////////////////////////////////////////////////////////
    // Initial function calls
    ////////////////////////////////////////////////////////////////////////////

    documentsProgress.spin();
    conceptProgress.spin();
    statementsProgress.spin();

    renderSelection();
});

