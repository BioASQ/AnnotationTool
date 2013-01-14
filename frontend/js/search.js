require(["app", "editQuestionTitle"], function(app, EditQuestionWidget) {
    // compile templates
    var searchResultTemplate,
        searchResultConceptTemplate,
        statementSearchResultTemplate,
        answerTemplate,
        paginationTemplate,
        source;
    // search res templaet
    source = $("#searchResultTemplate").html();
    searchResultTemplate = Handlebars.compile(source);
    // concept result template
    source = $("#searchResultConceptTemplate").html();
    searchResultConceptTemplate = Handlebars.compile(source);
    // statement search res
    source = $("#statementSearchResultTemplate").html();
    statementSearchResultTemplate = Handlebars.compile(source);
    // answer stuff
    source = $("#answerTemplate").html();
    answerTemplate = Handlebars.compile(source);
    // pagination stuff
    source = $("#paginationTemplate").html();
    paginationTemplate = Handlebars.compile(source);

    // cache dom pointers
    var questionTitle = $("#questionTitle"),
        searchResults = $("#searchResults"),
        answerList = $("#results"),
        searchQuery = $("#searchQuery"),
        conceptsResult = $("#conceptsResult"),
        docsResult = $("#docsResult"),
        statementsResult = $("#statementsResult");

    // other vars
    var results, currentQuery;

    var currentDocumentsPage = 1,
        totalDocumentPages;

    // init edit question title widget
    var eqtW = new EditQuestionWidget(app);

    // set title
    questionTitle.text(app.data.question.body);

    // render already found results
    var renderResults = function(){
        var i, res, html = "";
        for(i = 0; i < app.data.entities.length; i++){
            res = app.data.entities[i];

            // render to string
            html += answerTemplate(res);
        }

        answerList.html(html);
    };
    renderResults();

    // bind search
    $("#searchButton").click(function(){
        var query = searchQuery.val();
        searchQuery.val("");
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
        $.post(app.data.LogicServer+"concepts", {query:query}, function(data) {
            var i, res, html, internalID = 0;

            results = [];

            // show concepts
            if(data.results.concepts.length > 0){
                conceptsResult.show();

                html = "";
                for(i = 0; i < data.results.concepts.length; i++){
                    res = data.results.concepts[i];
                    if( typeof res == 'undefined' ) continue;
                    res.domClass = "conceptResult";
                    res["_internalID"] = internalID;
                    res["renderTitle"] = res["title"];
                    internalID++;
                    results.push(res);

                    // render to string
                    html += searchResultConceptTemplate(res);
                }

                // append to dom
                $(html).insertAfter(conceptsResult);
            }
        });

        // do document request
        documentSearch(query, currentDocumentsPage, function (result) {
            // TODO: fixme
            // Pagination example
            var pages = {pages: getPages(), rclass:'documentResult', current: currentDocumentsPage};
            var paginationHTML = paginationTemplate(pages);
            $(paginationHTML).insertAfter(docsResult);

            // append to dom
            $(result).insertAfter(docsResult);
        });

        // do statement request
        $.post(app.data.LogicServer+"statements", {query:query}, function(data){
            var i, res, html, internalID = 0;

            results = [];

            // show concepts
            if (data.results.statements.length > 0) {
                statementsResult.show();

                html = "";
                for(i = 0; i < data.results.statements.length; i++){
                    res = data.results.statements[i];
                    if (typeof res == 'undefined') continue;
                    res.domClass = "statementResult";
                    res["_internalID"] = internalID;
                    res["renderTitle"] = res["s"];
                    internalID++;
                    results.push(res);

                    // render to string
                    html += statementSearchResultTemplate(res);
                }

                // append to dom
                $(html).insertAfter(statementsResult);
            }
        });
    });

    $('.pagination.documentResult a').live('click', function () {
        var newPage;
        if ($(this).hasClass('prev')) {
            newPage = Math.max(1, currentDocumentsPage - 1);
        } else if ($(this).hasClass('next')) {
            newPage = Math.min(totalDocumentPages, currentDocumentsPage + 1);
        } else {
            newPage = parseInt($(this).html());
        }

        if ($(this).html() == '...' || newPage == currentDocumentsPage) { return false; }

        $('.documentResult').remove();

        documentSearch(currentQuery, newPage, function (result) {
            // TODO: fixme
            // Pagination example
            var pages = {pages: getPages(), rclass:'documentResult', current: currentDocumentsPage};
            var paginationHTML = paginationTemplate(pages);
            $(paginationHTML).insertAfter(docsResult);

            // append to dom
            $(result).insertAfter(docsResult);
            $("#toggleDocs").click().click();
        });
    });

    // bind toggle button
    var toggleClass = function(cls, elm){
        var show, state, c;
        
        state = elm.data('state');
        if(state == 'hidden'){
            elm.text('Collapse');
            elm.data('state', 'visible');
            show = true;
        }else{
            elm.text('Expand');
            elm.data('state', 'hidden');
            show = false;
        }

        c = $('.'+cls);
        if(show){
            c.show();
        }else{
            c.hide();
        }
    };
    $("#toggleConcepts").click(function(){
        toggleClass("conceptResult", $(this));
    });
    $("#toggleDocs").click(function(){
        toggleClass("documentResult", $(this));
    });
    $("#toggleStatments").click(function(){
        toggleClass("statementResult", $(this));
    });

    // bind add-remove stuff
    $("body").on('click', '.addremove', function(){
        var id = $(this).data('id');

        var i, res;
        for(i = 0; i < results.length; i++){
            if(results[i]["_internalID"] == id){
                res = results[i];
                break;
            }
        }

        // append to entities
        app.data.entities.push(res);
        // re-render
        renderResults();
    });

    // on done
    $("#doneButton").click(function(){
        app.save();

        window.location = "answerQuestion.html";
    });

    var documentSearch = function (query, page, cb) {
        $.post(app.data.LogicServer + 'documents', { query: query, page: page - 1 }, function (data) {
            var i, res, html, internalID = 0;

            totalDocumentPages = data.numPages;
            currentDocumentsPage = data.page + 1;

            results = [];
            html = '';

            // show concepts
            if (data.results.documents.length) {
                docsResult.show();

                for (i = 0; i < data.results.documents.length; i++) {
                    res = data.results.documents[i];
                    if (typeof res == 'undefined') continue;
                    res.domClass = 'documentResult';
                    res['_internalID'] = internalID;
                    res['renderTitle'] = res['title'];
                    internalID++;
                    results.push(res);

                    // render to string
                    html += searchResultTemplate(res);
                }
            }

            cb(html);
        });
    }

    var getPages = function () {
        var pages = [];
        for (var i = 1; i < totalDocumentPages && i < 5; ++i) {
            pages.push(String(i));
        }
        if (totalDocumentPages > 5) {
            pages.push('...');
        }
        pages.push(String(totalDocumentPages));
        return pages;
    }
});

