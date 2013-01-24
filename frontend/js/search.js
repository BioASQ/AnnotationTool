require(["app", "editQuestionTitle"], function (app, EditQuestionWidget) {
    // compiled templates
    var searchResultTemplate          = Handlebars.compile($("#searchResultTemplate").html()),
        searchResultConceptTemplate   = Handlebars.compile($("#searchResultConceptTemplate").html()),
        statementSearchResultTemplate = Handlebars.compile($("#statementSearchResultTemplate").html()),
        answerTemplate                = Handlebars.compile($("#answerTemplate").html()),
        paginationTemplate            = Handlebars.compile($("#paginationTemplate").html());

    // cached dom pointers
    var questionTitle    = $("#questionTitle"),
        searchResults    = $("#searchResults"),
        answerList       = $("#results"),
        searchQuery      = $("#searchQuery"),
        conceptsResult   = $("#conceptsResult"),
        docsResult       = $("#docsResult"),
        statementsResult = $("#statementsResult");

    // other vars
    var source, results, currentQuery, conceptResults = [];

    // pagination constants
    var itemsPerPage = 10;

    var currentDocumentsPage = 1,
        totalDocumentPages;

    var currentConceptsPage = 1,
        totalConceptsPages;

    // init edit question title widget
    var eqtW = new EditQuestionWidget(app);

    // set title
    questionTitle.text(app.data.question.body);

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

        // do concept request
        conceptSearch(query, currentConceptsPage, function (result) {
            // Pagination example
            var pages = {
                pages: getPages(totalConceptsPages),
                rclass:'conceptResult',
                current: currentConceptsPage
            };
            var paginationHTML = paginationTemplate(pages);
            $(paginationHTML).insertAfter(conceptsResult);

            // append to dom
            $(result).insertAfter(conceptsResult);
        });

        // do document request
        documentSearch(query, currentDocumentsPage, function (result) {
            // Pagination example
            var pages = {
                pages: getPages(totalDocumentPages),
                rclass:'documentResult',
                current: currentDocumentsPage
            };
            var paginationHTML = paginationTemplate(pages);
            $(paginationHTML).insertAfter(docsResult);

            // append to dom
            $(result).insertAfter(docsResult);
        });

        // do statement request
        $.post(app.data.LogicServer + 'statements', { query: query }, function (data) {
            results = [];

            // show concepts
            if (data.results.statements.length > 0) {
                statementsResult.show();
                var html = renderResults(data.results.statements,
                                         statementSearchResultTemplate,
                                         'statementResult');
                // append to dom
                $(html).insertAfter(statementsResult);
            }
        });
    });

    $('.pagination.conceptResult a').live('click', function () {
        var newPage = getNewPage(this, currentConceptsPage, totalConceptsPages);
        if (newPage == currentConceptsPage) { return false; }
        $('.conceptResult').remove();

        conceptSearch(currentQuery, newPage, function (result) {
            var pages = {
                pages: getPages(totalConceptsPages),
                rclass:'conceptResult',
                current: currentConceptsPage
            };
            var paginationHTML = paginationTemplate(pages);
            $(paginationHTML).insertAfter(conceptsResult);

            $(result).insertAfter(conceptsResult);
            $("#toggleConcepts").click().click();
        });
    });

    $('.pagination.documentResult a').live('click', function () {
        var newPage = getNewPage(this, currentDocumentsPage, totalDocumentPages);
        if (newPage == currentDocumentsPage) { return false; }
        $('.documentResult').remove();

        documentSearch(currentQuery, newPage, function (result) {
            var pages = {
                pages: getPages(totalDocumentPages),
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

    // bind add-remove stuff
    $('body').on('click', '.addremove', function () {
        var id = $(this).data('id');

        var i, res;
        for (i = 0; i < results.length; i++) {
            if (results[i]['_internalID'] == id) {
                res = results[i];
                break;
            }
        }

        // append to entities
        app.data.entities.push(res);
        // re-render
        renderSelection();
    });

    // on done
    $('#doneButton').click(function () {
        app.save();
        window.location = 'answerQuestion.html';
    });

    ////////////////////////////////////////////////////////////////////////////
    // Function definitions
    ////////////////////////////////////////////////////////////////////////////

    // Renders previously selected results into dropdown box
    var renderSelection = function () {
        var i, res, html = '';
        for (i = 0; i < app.data.entities.length; i++) {
            res = app.data.entities[i];

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
                currentConceptsPage = 1;
                totalConceptsPages = Math.ceil(concepts.length / itemsPerPage);
                showConcepts(1, cb);
            });
        } else {
            currentConceptsPage = page;
            showConcepts(page, cb);
        }
    };

    var fetchConcepts = function (query, page, cb) {
        $.post(app.data.LogicServer + 'concepts', { query: query }, function (data) {
            if (data.results.concepts.length) {
                cb(data.results.concepts);
            } else {
                cb([]);
            }
        });
    };

    var showConcepts = function (page, cb) {
        conceptsResult.show();
        results = [];
        var begin = (page - 1) * itemsPerPage,
            html = renderResults(conceptResults.slice(begin, begin + itemsPerPage),
                                 searchResultConceptTemplate,
                                 'conceptResult');

        cb(html);
    }

    var documentSearch = function (query, page, cb) {
        $.post(app.data.LogicServer + 'documents', { query: query, page: page - 1 }, function (data) {
            totalDocumentPages = data.numPages;
            currentDocumentsPage = data.page + 1;

            results = [];
            var html = '';

            // show documents
            if (data.results.documents.length) {
                docsResult.show();
                html = renderResults(data.results.documents,
                                     searchResultTemplate,
                                     'documentResult');
            }

            cb(html);
        });
    }

    var renderResults = function (renderData, template, className) {
        var html = '',
            internalID = 0;
        for (var i = 0; i < renderData.length; i++) {
            var current = renderData[i];
            if (typeof current == 'undefined') continue;
            current.domClass = className;
            current['_internalID'] = internalID++;
            current['renderTitle'] = current['title'];
            results.push(current);

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
    }

    // Return array with page names
    var getPages = function (total) {
        var pages = [];
        for (var i = 1; i < total && i < 5; ++i) {
            pages.push(String(i));
        }
        if (total > 5) {
            pages.push('...');
        }
        pages.push(String(total));
        return pages;
    }

    ////////////////////////////////////////////////////////////////////////////
    // Initial function calls
    ////////////////////////////////////////////////////////////////////////////

    renderSelection();
});

