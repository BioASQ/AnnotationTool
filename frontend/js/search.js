require(["app", "editQuestionTitle", "spinner"], function (app, EditQuestionWidget) {
    // compiled templates
    var searchResultTemplate          = Handlebars.compile($("#searchResultTemplate").html()),
        searchResultConceptTemplate   = Handlebars.compile($("#searchResultConceptTemplate").html()),
        sourceSelectionTemplate       = Handlebars.compile($("#sourceSelectionTemplate").html()),
        statementSearchResultTemplate = Handlebars.compile($("#statementSearchResultTemplate").html()),
        answerTemplate                = Handlebars.compile($("#answerTemplate").html()),
        paginationTemplate            = Handlebars.compile($("#paginationTemplate").html());

    // cached dom pointers
    var questionTitle = $("#questionTitle"),
        searchResults = $("#searchResults"),
        answerList    = $("#results"),
        searchQuery   = $("#searchQuery");

    // other vars
    var source, currentQuery;

    // cache of currently displayed results
    var results = {
        concepts:   [],
        documents:  [],
        statements: []
    };

    var conceptSources = [
        { name: 'Disease Ontology', active: true },
        { name: 'Gene Ontology',    active: true },
        { name: 'Jochem',           active: true },
        { name: 'MeSH',             active: true },
        { name: 'UniProt',          active: true }
    ];

    var renderState = {
        concepts: {
            currentPage:       1,
            totalPages:        1,
            size:              1,
            request:           null,
            extensionTemplate: Handlebars.compile($("#extendedConceptResultTemplate").html()),
            progress:          $("#conceptProgress"),
            header:            $("#conceptsResult .result-header"),
            result:            $("#conceptsResult"),
            container:         $("#conceptsResult").parent('.results-container'),
            toggle:            $("#toggleConcepts"),
            resultClass:       'conceptResult',
            sectionName:       'concepts',
            sources:           conceptSources,
            results:           [],
            allSources:        []
        },
        documents: {
            currentPage:       1,
            totalPages:        1,
            size:              1,
            request:           null,
            extensionTemplate: Handlebars.compile($("#extendedDocumentResultTemplate").html()),
            progress:          $("#documentsProgress"),
            header:            $("#documentsResult .result-header"),
            result:            $("#documentsResult"),
            container:         $("#documentsResult").parent('.results-container'),
            toggle:            $("#toggleDocs"),
            resultClass:       'documentResult',
            sectionName:       'documents',
            results:           []
        },
        statements: {
            currentPage:       1,
            totalPages:        1,
            size:              1,
            request:           null,
            extensionTemplate: Handlebars.compile($("#extendedStatementResultTemplate").html()),
            progress:          $("#statementsProgress"),
            header:            $("#statementsResult .result-header"),
            result:            $("#statementsResult"),
            container:         $("#statementsResult").parent('.results-container'),
            toggle:            $("#toggleStatements"),
            resultClass:       'statementResult',
            sectionName:       'statements',
            results:           []
        }
    }

    // pagination constants
    var itemsPerPage = 10;

    // init edit question title widget
    var eqtW = new EditQuestionWidget(app);

    // set title
    questionTitle.text(app.data.question.body);
    questionTitle.attr('data-original-title', app.data.question.body);
    questionTitle.tooltip();

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

    var renderSection = function (sectionName, result) {
        if (renderState[sectionName].sources) {
            var sourceSelectionHTML = sourceSelectionTemplate({
                sources: renderState[sectionName].sources,
                rclass: renderState[sectionName].resultClass
            });
            renderState[sectionName].container.append(sourceSelectionHTML);
        }

        renderState[sectionName].container.append(result);

        if (renderState[sectionName].totalPages > 1) {
            var pages = {
                pages: getPages(renderState[sectionName].totalPages,
                                renderState[sectionName].currentPage),
                current: renderState[sectionName].currentPage,
                rclass: renderState[sectionName].resultClass,
                section: renderState[sectionName].sectionName
            };
            var paginationHTML = paginationTemplate(pages);
            renderState[sectionName].container.append(paginationHTML);
        }

        renderState[sectionName].toggle.click().click();
    };

    var searchConcepts = renderState.concepts.search = function (query, page, cb) {
        if (page == 1 && !renderState.concepts.results.length) {
            fetchConcepts(query, page, function (concepts) {
                renderState.concepts.results     = concepts;
                renderState.concepts.allSources  = concepts;
                renderState.concepts.currentPage = 1;
                renderState.concepts.totalPages  = Math.ceil(renderState.concepts.results.length / itemsPerPage);
                renderState.concepts.size        = renderState.concepts.results.length;
                showConcepts(1, cb);
            });
        } else {
            renderState.concepts.currentPage = page;
            showConcepts(page, cb);
        }
    };

    var fetchConcepts = function (query, page, cb) {
        renderState.concepts.progress.parent().show();

        renderState.concepts.request = $.post(
            app.data.LogicServer + 'concepts',
            { query: query },
            function (data) {
                renderState.concepts.request = null;
                if (data.results.concepts.length) {
                    cb(data.results.concepts);
                } else {
                    cb([]);
                }
            }
        ).error(function () {
            renderState.concepts.request = null;
            renderState.concepts.progress.parent().hide();
            renderState.concepts.header.html('Search for concepts failed.');
        });
    };

    var showConcepts = function (page, cb) {
        renderState.concepts.result.show();

        // render one page of concepts
        var begin = (page - 1) * itemsPerPage,
            html = renderResults(renderState.concepts.results.slice(begin, begin + itemsPerPage),
                                 searchResultConceptTemplate,
                                 'conceptResult',
                                 'concepts');

        cb(html);
    };

    var filterConcepts = function (source, sourceNames) {
        return source.filter(function (result, index) {
            return (sourceNames.indexOf(result.source) > -1);
        });
    };

    var searchDocuments = renderState.documents.search = function (query, page, cb) {
        renderState.documents.progress.parent().show();

        renderState.documents.request = $.post(
            app.data.LogicServer + 'documents',
            { query: query, page: page - 1, pageSize: itemsPerPage },
            function (data) {
                renderState.documents.request     = null;
                renderState.documents.totalPages  = Math.ceil(data.size / itemsPerPage);
                renderState.documents.currentPage = data.page + 1;
                renderState.documents.size        = data.size;
                renderState.documents.results     = data.results.documents;

                renderState.documents.result.show();

                // show documents
                var html = '';
                if (data.results.documents.length) {
                    html = renderResults(renderState.documents.results,
                                         searchResultTemplate,
                                         'documentResult',
                                         'documents');
                }

                cb(html);
            }
        ).error(function () {
            renderState.documents.request = null;
            renderState.documents.progress.parent().hide();
            renderState.documents.result.show();
            renderState.documents.header.html('Search for documents failed.');
        });
    };

    var searchStatements = renderState.statements.search = function (query, page, cb) {
        if (page == 1 && !renderState.statements.results.length) {
            fetchStatements(query, page, function (statements) {
                renderState.statements.results     = statements;
                renderState.statements.currentPage = 1;
                renderState.statements.totalPages  = Math.ceil(statements.length / itemsPerPage);
                renderState.statements.size        = statements.length;

                showStatements(1, cb);
            });
        } else {
            renderState.statements.currentPage = page;
            showStatements(page, cb);
        }
    };

    var fetchStatements = function (query, page, cb) {
        renderState.statements.progress.parent().show();

        renderState.statements.request = $.post(
            app.data.LogicServer + 'statements',
            { query: query, page: page - 1, pageSize: itemsPerPage },
            function (data) {
                renderState.statements.request = null;
                if (data.results.statements.length) {
                    cb(data.results.statements);
                } else {
                    cb([]);
                }
            }
        ).error(function () {
            renderState.statements.request = null;
            renderState.statements.progress.parent().hide();
            renderState.statements.result.show();
            renderState.statements.header.html('Search for statements failed.');
        });
    };

    var showStatements = function (page, cb) {
        renderState.statements.result.show();

        // render one page of statements
        var begin = (page - 1) * itemsPerPage,
            html  = renderResults(renderState.statements.results.slice(begin, begin + itemsPerPage),
                                  statementSearchResultTemplate,
                                  'statementResult',
                                  'statements');
        cb(html);
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

    var isSelected = function (item) {
        for (var i = 0; i < app.data.question.entities.length; i++) {
            var current = app.data.question.entities[i];
            if (equal(current, item)) { return true; }
        }
        return false;
    };

    var renderResults = function (renderData, template, className, resultSection) {
        var html = '',
            internalID = 0;
        for (var i = 0; i < renderData.length; i++) {
            var current = renderData[i];
            if (typeof current == 'undefined') continue;
            current.domClass       = className;
            current['_internalID'] = resultSection + '-' + Date.now() + ':' + internalID++;
            current['renderTitle'] = current['title'];
            current['selected']    = isSelected(current);
            results[resultSection].push(current);

            // render to string
            html += template(current);
        }
        return html;
    };

    var getResult = function (sectionName, id) {
        for (var i = 0; i < results[sectionName].length; i++) {
            if (results[sectionName][i]['_internalID'] == id) {
                return results[sectionName][i];
            }
        }
    }

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

        if (max <= total && max % 2 == 0) {
            rightAdjust = 0;
        }

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
    // Event handlers
    ////////////////////////////////////////////////////////////////////////////

    // bind search
    $("#searchButton").click(function () {
        var query = searchQuery.val();
        // searchQuery.val("");
        currentQuery = query;

        jQuery.each(['concepts', 'documents', 'statements'], function (key, sectionName) {
            // reset results
            results[sectionName] = [];

            // reset toggle
            var tc = renderState[sectionName].toggle;
            if (tc.data('state') !== 'hidden') {
                toggleClass(renderState[sectionName].resultClass, tc);
            }

            // clean old results
            $('.' + renderState[sectionName].resultClass).remove();

            // abort old ajax requests
            if (renderState[sectionName].request !== null) {
                renderState[sectionName].request.abort();
            }

            // hide result section (whilst spinner is shown)
            renderState[sectionName].result.hide();
        });

        // reset concept search
        renderState.concepts.results    = [];
        renderState.concepts.allSources = [];
        // reset concepts pager
        renderState.concepts.currentPage = 1;
        // enable all sources
        jQuery.each(renderState.concepts.sources, function (index, sourceDescription) {
            sourceDescription.active = true;
        });
        // do concept request
        searchConcepts(query, renderState.concepts.currentPage, function (result) {
            renderState.concepts.progress.parent().hide();

            var sectionTitle = renderState.concepts.header.data('name')
                             + ' (' + renderState.concepts.size + ')';
            renderState.concepts.header.html(sectionTitle);
            renderSection('concepts', result);
        });

        // reset documents pager
        renderState.documents.currentPage = 1;
        // do document request
        searchDocuments(query, renderState.documents.currentPage, function (result) {
            renderState.documents.progress.parent().hide();
            var sectionTitle = renderState.documents.header.data('name')
                             + ' (' + renderState.documents.size + ')';
            renderState.documents.header.html(sectionTitle);
            renderSection('documents', result);
        });

        // reset statement results
        renderState.statements.results = [];
        // reset statements pager
        renderState.statements.currentPage = 1;
        // do statement request
        searchStatements(query, renderState.statements.currentPage, function (result) {
            renderState.statements.progress.parent().hide();
            var sectionTitle = renderState.statements.header.data('name')
                             + ' (' + renderState.statements.size + ')';
            renderState.statements.header.html(sectionTitle);
            renderSection('statements', result);
        });
    });

    $('.pagination a').live('click', function () {
        if ($(this).parent('li').is('.disabled')) { return false; }

        var sectionName = $(this).closest('.pagination').data('sectionName'),
            section = renderState[sectionName],
            newPage = getNewPage(this, section.currentPage, section.totalPages);

        if (newPage == section.currentPage) { return false; }
        $('.' + section.resultClass).remove();

        renderState[sectionName].progress.parent().show();
        section.search(currentQuery, newPage, function (result) {
            renderState[sectionName].progress.parent().hide();
            renderSection(sectionName, result);
        });
    });

    $('#toggleConcepts').click(function ()   { toggleClass('conceptResult', $(this)); });
    $('#toggleDocs').click(function ()       { toggleClass('documentResult', $(this)); });
    $('#toggleStatements').click(function () { toggleClass('statementResult', $(this)); });

    $('.source-toggle').live('click', function () {
        var toggledSource = $(this).html(),
            sources = renderState.concepts.sources;
        for (var i = 0; i < sources.length; i++) {
            if (sources[i].name == toggledSource) {
                sources[i].active = !sources[i].active;
                break;
            }
        }
        var sourceNames = sources.filter(function (source) { return source.active; })
                                 .map(function (source)    { return source.name; });

        renderState.concepts.results     = filterConcepts(renderState.concepts.allSources, sourceNames);
        renderState.concepts.currentPage = 1;
        renderState.concepts.totalPages  = Math.ceil(renderState.concepts.results.length / itemsPerPage);
        renderState.concepts.size        = renderState.concepts.results.length;

        var sectionTitle = renderState.concepts.header.data('name')
                         + ' (' + renderState.concepts.size + ')';
        renderState.concepts.header.html(sectionTitle);

        $('.' + renderState.concepts.resultClass).remove();
        showConcepts(renderState.concepts.currentPage, function (result) {
            renderSection('concepts', result);
        });
    });

    // bind add-remove stuff
    $('.addremove').live('click', function () {
        var id          = $(this).data('id'),
            sectionName = id.replace(/-[\d:]+/, ''),
            res         = getResult(sectionName, id);

        if (res) {
            if (isSelected(res)) {
                // remove from entities
                for (var i = 0; i < app.data.question.entities.length; i++) {
                    if (equal(app.data.question.entities[i], res)) {
                        app.data.question.entities.splice(i, 1);
                    }
                }
                $(this).children('.icon-minus').removeClass('icon-minus').addClass('icon-plus');
            } else {
                // store current query
                res.query = currentQuery;
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
        var newLocation;
        if (window.shared.shared.mode === window.shared.shared.MODE_ASSESSMENT) {
            newLocation = 'editAnswer.html';
        } else {
            newLocation = 'answerQuestion.html';
        }

        app.save();
        // post
        $.ajax({
            url:         app.data.LogicServer + 'questions/' + app.data.question._id,
            contentType: 'application/json',
            dataType:    'json',
            data:        JSON.stringify(app.data.question),
            type:        'POST',
            success:     function (data) { window.location = newLocation; },
            error:       function ()     { alert('Something went wrong'); }
        });

    });

    $('.more-info').live('click', function () {
        if (!$(this).parent().siblings('.search-result-info').length) {
            var id          = $(this).parents('.search-result').data('id'),
                sectionName = id.replace(/-[\d:]+/, ''),
                doc         = getResult(sectionName, id),
                html        = renderState[sectionName].extensionTemplate(doc);
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
    // Initial function calls
    ////////////////////////////////////////////////////////////////////////////

    renderState.documents.progress.spin();
    renderState.concepts.progress.spin();
    renderState.statements.progress.spin();

    renderSelection();
});

