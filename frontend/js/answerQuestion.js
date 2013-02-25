require(["app", "editQuestionTitle"], function(app, EditQuestionWidget) {
    // cache pointers to DOM
    var $saveButton = $("#saveButton"),
        $questionAnswer = $("#questionAnswer"),
        $answerSpace = $("#answerSpace"),
        $questionTitle = $("#questionTitle"),
        $snippetsList = $("#snippetsList");

    // annotation btns
    var $startAnn = $("#startAnn"),
        $annDoc = $("#annDoc"),
        $annTxt = $("#annTxt"),
        $annCancel = $("#annCancel");

    // define data stuctures
    var answer = {
            "text": "",
            "html": "",
            "annotations": []
        },
        lastAnnotationId = 0,
        currentAnnotation = null,
        currentDocument = null;

    var selectedDocuments = app.data.question.entities;

    // docs template
    var source = $("#documentTemplate").html(),
        docTemplate = Handlebars.compile(source);

    // annotation highlight tempalte
    source = $("#annotationTemplate").html();
    var annTemplate = Handlebars.compile(source);

    // snippet template
    source = $("#snippetTemplate").html();
    var snipTemplate = Handlebars.compile(source);

    // init edit question title widget
    var eqtW = new EditQuestionWidget(app);

    // set question text
    $questionTitle.text(app.data.question.body);
    $questionTitle.attr('data-original-title', app.data.question.body);
    $questionTitle.tooltip();

    //
    var updateQuestionText = function(){
        $answerSpace.html(answer.html);
    };

    var tagsToEscape = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;'
    };
    var escapeTag = function(tag) {
        return tagsToEscape[tag] || tag;
    };
    var safeTagsReplace = function(str) {
        return str.replace(/[&<>]/g, escapeTag);
    };
    var safeTagsUnescape = function(str) {
        return $('<div/>').html(str).text();
    };
    var quoteRegex = function(str) {
        return (str+'').replace(/([.?*+^$[\]\\(){}|-])/g, "\\$1");
    };
    var getSelectionHtml = function() {
        var html = "";
        if (typeof window.getSelection != "undefined") {
            var sel = window.getSelection();
            if (sel.rangeCount) {
                var container = document.createElement("div");
                for (var i = 0, len = sel.rangeCount; i < len; ++i) {
                    container.appendChild(sel.getRangeAt(i).cloneContents());
                }
                html = container.innerHTML;
            }
        } else if (typeof document.selection != "undefined") {
            if (document.selection.type == "Text") {
                html = document.selection.createRange().htmlText;
            }
        }

        return html;
    };

    var renderCurrentDocument = function(){
        // set title
        $("#docTitle").html( currentDocument.renderTitle );

        // render body
        if(currentDocument.domClass == 'documentResult'){
            // render to string
            var html = docTemplate(currentDocument);
            $viewer.html(html);
        }else if(currentDocument.domClass == 'statementResult'){
            if( typeof currentDocument.AJAXText == 'undefined' )
                currentDocument.AJAXText = safeTagsReplace("<"+currentDocument.s+"> <"+currentDocument.p+"> \""+currentDocument.o+"\" .");
            $viewer.html(currentDocument.AJAXText);
        }else{
            // if text is not yet loaded - load
            if( typeof currentDocument.AJAXText == 'undefined' || currentDocument.AJAXText === null ){
                // clean old stuff
                $viewer.html("Loading..");

                var url = currentDocument.uri;

                if(typeof url == 'undefined' || url === null ){
                    $viewer.html("This document has no body.");
                }else{
                    $.ajax({
                        url: app.data.LogicServer + 'corsProxy?url=' + encodeURIComponent(url),
                        type: 'GET',
                        success: function (data) {
                           if (data.length > 0) {
                                currentDocument.AJAXText = data;
                                $viewer.html(data);
                            } else {
                                currentDocument.AJAXText = 0;
                                $viewer.html("This document has no body.");
                            }
                        },
                        error: function (xhr, err) {
                            currentDocument.AJAXText = 0;
                            $viewer.html("This document could not be found.");
                        }
                    });
                }
            }else{
                // if text is loaded - just render
                if( currentDocument.AJAXText !== 0 ){
                    $viewer.html(currentDocument.AJAXText);
                }else{
                    $viewer.html("This document has no body.");
                }
            }
        }

        // render annotations list
        renderAnnotationsList();
    };

    var renderAnnotationsList = function () {
        var html = '';
        for(var i = 0; i < answer.annotations.length; i++){
            html += snipTemplate({text: safeTagsUnescape(answer.annotations[i].annotationText), id: answer.annotations[i].id});
        }
        $snippetsList.html(html);
    };

    var prepareAnnotation = function(){
        answer.text = $questionAnswer.val();
        var text = answer.text;//getSelectionHtml();

        var begin = 0;//answer.text.indexOf(text);
        if( begin != -1 ){
            var id = ++lastAnnotationId;
            answer.annotations.push({
                "beginIndex": begin,
                "length": text.length,
                "text": text,
                "id": id,
                "html": "<span style='background-color: #fff000;'>"+text+"</span>"
            });
            currentAnnotation = answer.annotations[answer.annotations.length-1];

            // render
            //answer.html = answer.html.replace(text, currentAnnotation.html);
            //updateQuestionText();

            // show buttons
            //$startAnn.hide();
            //$annCancel.show();
            //$annDoc.show();
            //$annTxt.show();
        }
    };

    // event for freezing answer
    /*$("#freezeButton").on("click", function(){
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
    $questionAnswer.keydown(function(){
        if(typingTimeout != -1) {
            window.clearTimeout(typingTimeout);
            typingTimeout = -1;
        }
    }).keyup(function(){
        if(typingTimeout == -1) {
            typingTimeout = window.setTimeout(function(){
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
    $startAnn.on("click", prepareAnnotation);

    $annCancel.on('click', function(){
        // revert
        //answer.html = answer.html.replace(currentAnnotation.html, currentAnnotation.text);
        //updateQuestionText();

        // remove annotation
        answer.annotations.pop();

        // show buttons
        $startAnn.show();
        $annCancel.hide();
        $annDoc.hide();
        $annTxt.hide();
    });

    $annDoc.on('click', function(){
        if(typeof currentDocument == 'undefined' || currentDocument === null){
            alert('No document selected!');
            return;
        }

        // prepare new annotation
        prepareAnnotation();

        // update view
        //var oldHtml = currentAnnotation.html;
        // TODO: randomly generate color
        //currentAnnotation.html = currentAnnotation.html.replace("#fff000", "#ff0000");
        //answer.html = answer.html.replace(oldHtml, currentAnnotation.html);
        //updateQuestionText();

        // add doc data to annotation
        currentAnnotation["annotationDocument"] = currentDocument.uri;
        currentAnnotation["annotationText"] = null;

        // store current annotation
        app.data.question.answer = answer;
        app.save();

        // show buttons
        //$startAnn.show();
        //$annCancel.hide();
        //$annDoc.hide();
        //$annTxt.hide();
    });

    $annTxt.on('click', function(){
        answer.text = $questionAnswer.val();
        var text = getSelectionHtml();

        if( text.length > 0 ){
            if(typeof currentDocument == 'undefined' || currentDocument === null){
                alert('No document selected!');
                return;
            }

            // prepare new annotation
            prepareAnnotation();

            // update view
            //var oldHtml = currentAnnotation.html;
            // TODO: randomly generate color
            //currentAnnotation.html = currentAnnotation.html.replace("#fff000", "#ff0000");
            //answer.html = answer.html.replace(oldHtml, currentAnnotation.html);
            //updateQuestionText();

            // add doc data to annotation
            currentAnnotation["annotationDocument"] = currentDocument.uri;
            currentAnnotation["annotationText"] = text;
            currentAnnotation["annotationHTML"] = annTemplate({text: safeTagsUnescape(text), id: currentAnnotation.id});

            // render annotation in text
            stext = safeTagsUnescape(text);
            if(currentDocument.title.indexOf(stext) != -1){
                currentDocument.renderTitle = currentDocument.renderTitle.replace(
                    new RegExp( quoteRegex(stext), 'g'),
                    currentAnnotation.annotationHTML
                );
            }else if(currentDocument.domClass == 'documentResult'){
                for(var i = 0; i < currentDocument.sections.length; i++){
                    if(currentDocument.sections[i].indexOf(text) != -1 ){
                        currentDocument.sections[i] = currentDocument.sections[i].replace(
                            new RegExp( quoteRegex(text), 'g'),
                            currentAnnotation.annotationHTML
                        );
                    }else if(currentDocument.sections[i].indexOf(stext) != -1 ){
                        currentDocument.sections[i] = currentDocument.sections[i].replace(
                            new RegExp( quoteRegex(stext), 'g'),
                            currentAnnotation.annotationHTML
                        );
                    }
                }
            }else{
                var repl;
                if( currentDocument.AJAXText.indexOf(text) != -1 ){
                    repl = text;
                }else if(currentDocument.AJAXText.indexOf(stext) != -1){
                    repl = stext;
                }
                currentDocument.AJAXText = currentDocument.AJAXText.replace(
                    new RegExp( quoteRegex(repl), 'g'),
                    currentAnnotation.annotationHTML
                );
            }

            // re-render
            renderCurrentDocument();

            // store current annotation
            app.data.question.answer = answer;
            app.save();

            // show buttons
            //$startAnn.show();
            //$annCancel.hide();
            //$annDoc.hide();
            //$annTxt.hide();
        }else{
            alert('No text selected!');
        }

        return false;
    });

    $saveButton.on('click', function(){
        var question = app.data.question;
        question.answer = answer;
        app.save();
        // post
        $.ajax({
            url: app.data.LogicServer+"questions/"+question._id,
            contentType: "application/json",
            dataType: "json",
            data: JSON.stringify(question),
            type: "POST",
            success: function(data){
                $("#saveSuccess").show();
            },
            error: function(){
                $("#saveError").show();
            }
        });

        return false;
    });

    // on result docs click
    $("body").on("click", ".resultDocument", function(){
        // get pdf url
        var num = $(this).data('num');

        // set current doc
        var i;
        for(i = 0; i < selectedDocuments.length; i++){
            if( selectedDocuments[i]["_internalID"] === num ){
                currentDocument = selectedDocuments[i];
                break;
            }
        }

        // render content
        renderCurrentDocument();

        return false;
    })
    .on('click', ".annotationText", function(){
        var id = $(this).data('id'),
            i, ann;

        for(i = 0; i < answer.annotations.length; i++){
            if(answer.annotations[i].id == id){
                ann = answer.annotations[i];
                break;
            }
        }

        // remove annotation from text
        var text = ann.annotationText;
        if(currentDocument.renderTitle.indexOf(ann.annotationHTML) != -1){
            currentDocument.renderTitle = currentDocument.renderTitle.replace(
                new RegExp( quoteRegex(ann.annotationHTML), 'g'),
                text
            );
        }else if(currentDocument.domClass == 'documentResult'){
            for(var j = 0; j < currentDocument.sections.length; j++){
                if(currentDocument.sections[j].indexOf(ann.annotationHTML) != -1 ){
                    currentDocument.sections[j] = currentDocument.sections[j].replace(
                        new RegExp( quoteRegex(ann.annotationHTML), 'g'),
                        text
                    );
                }
            }
        }else{
            currentDocument.AJAXText = currentDocument.AJAXText.replace(
                new RegExp( quoteRegex(ann.annotationHTML), 'g'),
                text
            );
        }

        // remove from array
        answer.annotations.splice(i, 1);

        // re-render
        renderCurrentDocument();
    })
    .on("click", ".removeFromResults", function(){
        var that = $(this),
            num = that.data('num');

        // remove from storage
        for(var i = 0; i < app.data.question.entities.length; i++){
            if(app.data.question.entities[i]._internalID == num){
                app.data.question.entities.splice(i, 1);
                app.save();
                break;
            }
        }

        that.parent().parent().remove();
    });

    // get view contatiner
    $viewer = $("#viewer");

    // render docs
    // compile template
    source = $("#resultTemplate").html();
    var template = Handlebars.compile(source);
    // render to string
    var html = "",
        type,
        i = 0;
    for(i = 0; i < selectedDocuments.length; i++){
        type = selectedDocuments[i]._internalID[0].toUpperCase();
        html += template($.extend({}, selectedDocuments[i], { type: type }));
    }

    // restore answer
    if( app.data.question.answer !== null && typeof app.data.question.answer != 'undefined' ){
        // render text
        if( app.data.question.answer.hasOwnProperty('text') )
            $questionAnswer.val(app.data.question.answer.text);

        // get answer
        answer = app.data.question.answer;

        // get last id
        var annid = null;
        for(i = 0; i < app.data.question.answer.annotations.length; i++){
            annid = parseInt(app.data.question.answer.annotations[i].id, 10);
            if( lastAnnotationId < annid ){
                lastAnnotationId = annid;
            }
        }

        // render annotations
        renderAnnotationsList();
    }

    // append to dom
    $("#resultList").html(html);

    $('tr.result-row').tooltip();

    $('#annTxt').affix({
        offset: {
            top: $('#annTxt').offset().top - $('.navbar-fixed-top').first().height()
        }
    });
    $('#annTxt').parent().css('height', $('#annTxt').parent().height());

    //sort result list
    var sort = true;
    var asc = false;
    $("body").on("click", "#dataType", function () {
        if (sort) {
            asc = !asc;
            asc ?
                $("#dataType").html('<i class="icon-arrow-down"></i>')
            :
                $("#dataType").html('<i class="icon-arrow-up"></i>');

            $('tr.result-row').tooltip('destroy');

            //bubble sort
            var n = $("tr.result-row").length;
            do {
                var rep = 0;
                for (var index = 0 ; index < n; index++) {
                    var element = $("tr.result-row")[index];
                    var next = $(element).next();
                    if (!asc) {
                        var tmp = element;
                        element = next;
                        next = tmp;
                    }
                    if ($(element).attr("data-type") > $(next).attr("data-type")) {
                        $(element).replaceWith($(next).after($(element).clone(true,true)));

                        rep = index;
                    }
                }
                n = rep;
            } while (n != 0);
            sort = false;
        } else {
            $("#resultList").html(html);
            $("#dataType").html('<i class="icon-resize-vertical"></i>');
            sort = true;
        }
        $('tr.result-row').tooltip();
    });
});
