require(["app", "editQuestionTitle"], function(app, EditQuestionWidget) {
    // compile templates
    var searchResultTemplate,
        searchResultConceptTemplate,
        statementSearchResultTemplate,
        answerTemplate,
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

    // cache dom pointers
    var questionTitle = $("#questionTitle"),
        searchResults = $("#searchResults"),
        answerList = $("#results"),
        searchQuery = $("#searchQuery"),
        conceptsResult = $("#conceptsResult"),
        docsResult = $("#docsResult"),
        statementsResult = $("#statementsResult");

    // other vars
    var results;

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


        // do request
        $.post(app.data.LogicServer+"search", {query:query}, function(data){
            var i, res, html, internalID = 0;

            results = [];
            console.log(data);

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

            // show concepts
            if(data.results.documents.length > 0){
                docsResult.show();

                html = "";
                for(i = 0; i < data.results.documents.length; i++){
                    res = data.results.documents[i];
                    if( typeof res == 'undefined' ) continue;
                    res.domClass = "documentResult";
                    res["_internalID"] = internalID;
                    res["renderTitle"] = res["title"];
                    internalID++;
                    results.push(res);

                    // render to string
                    html += searchResultTemplate(res);
                }

                // append to dom
                $(html).insertAfter(docsResult);
            }

            // show concepts
            if(data.results.statements.length > 0){
                statementsResult.show();

                html = "";
                for(i = 0; i < data.results.statements.length; i++){
                    res = data.results.statements[i];
                    if( typeof res == 'undefined' ) continue;
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
});
