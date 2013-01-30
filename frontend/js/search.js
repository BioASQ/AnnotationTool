require(["app", "editQuestionTitle"], function (app, EditQuestionWidget) {
    // compiled templates
    var searchResultTemplate          = Handlebars.compile($("#searchResultTemplate").html()),
        searchResultConceptTemplate   = Handlebars.compile($("#searchResultConceptTemplate").html()),
        statementSearchResultTemplate = Handlebars.compile($("#statementSearchResultTemplate").html()),
        answerTemplate                = Handlebars.compile($("#answerTemplate").html()),
        paginationTemplate            = Handlebars.compile($("#paginationTemplate").html()),
        documentExtensionTemplate     = Handlebars.compile($("#extendedDocumentResultTemplate").html());
        statementExtensionTemplate    = Handlebars.compile($("#extendedStatementResultTemplate").html());

    // cached dom pointers
    var questionTitle    = $("#questionTitle"),
        searchResults    = $("#searchResults"),
        answerList       = $("#results"),
        searchQuery      = $("#searchQuery"),
        conceptsResult   = $("#conceptsResult"),
        docsResult       = $("#documentsResult"),
        statementsResult = $("#statementsResult");

    // other vars
    var source, currentQuery, conceptResults = [];

    var results = {
        'concepts': [],
        'documents': [],
        'statements': []
    };

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
            if (result.length) {
                if (totalConceptsPages > 1) {
                    // Concept pagination
                    var pages = {
                        pages: getPages(totalConceptsPages),
                        rclass:'conceptResult',
                        current: currentConceptsPage
                    };
                    var paginationHTML = paginationTemplate(pages);
                    $(paginationHTML).insertAfter(conceptsResult);
                }
                // append to dom
                $(result).insertAfter(conceptsResult);
            }
        });

        // do document request
        documentSearch(query, currentDocumentsPage, function (result) {
            if (totalDocumentPages > 1) {
                // Document pagination
                var pages = {
                    pages: getPages(totalDocumentPages),
                    rclass:'documentResult',
                    current: currentDocumentsPage
                };
                var paginationHTML = paginationTemplate(pages);
                $(paginationHTML).insertAfter(docsResult);
            }

            // append to dom
            $(result).insertAfter(docsResult);
        });

        // do statement request
        $.post(app.data.LogicServer + 'statements', { query: query }, function (data) {
            results.statements = [];

            // show statements
            if (data.results.statements.length > 0) {
                statementsResult.show();
                var html = renderResults(data.results.statements,
                                         statementSearchResultTemplate,
                                         'statementResult',
                                         'statements');
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
    $('.addremove').live('click', function () {
        var id = $(this).data('id'),
            sectionName = id.replace(/-\d+/, ''),
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
                        app.data.question.entities = app.data.question.entities.splice(i, 1);
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
                sectionName = id.replace(/-\d+/, '');

            var doc = results[sectionName][index];
            var html;
            if (sectionName == 'documents') {
                html = documentExtensionTemplate(doc);
            } else {
                html = statementExtensionTemplate(doc);
            }
            $(html).insertAfter();
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
            html = renderResults(conceptResults.slice(begin, begin + itemsPerPage),
                                 searchResultConceptTemplate,
                                 'conceptResult',
                                 'concepts');

        cb(html);
    };

    var documentSearch = function (query, page, cb) {
        $.post(app.data.LogicServer + 'documents', { query: query, page: page - 1 }, function (data) {
            totalDocumentPages = data.numPages;
            currentDocumentsPage = data.page + 1;

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
        });
    };

    var renderResults = function (renderData, template, className, resultSection) {
        var html = '',
            internalID = 0;
        for (var i = 0; i < renderData.length; i++) {
            var current = renderData[i];
            if (typeof current == 'undefined') continue;
            current.domClass = className;
            current['_internalID'] = resultSection + '-' + internalID++;
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
    };

    ////////////////////////////////////////////////////////////////////////////
    // Initial function calls
    ////////////////////////////////////////////////////////////////////////////

    renderSelection();
});

