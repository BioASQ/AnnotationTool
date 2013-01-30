require(["app", "editQuestionTitle"], function(app, EditQuestionWidget) {
    // cache pointers to DOM
    var $saveButton = $("#saveButton"),
        $questionAnswer = $("#questionAnswer"),
        $answerSpace = $("#answerSpace"),
        $questionTitle = $("#questionTitle");

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

    // init edit question title widget
    var eqtW = new EditQuestionWidget(app);

    // set question text
    $questionTitle.text(app.data.question.body);

    //
    var updateQuestionText = function(){
        $answerSpace.html(answer.html);
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
        if(currentDocument.domClass == 'documentResult'){
            // render to string
            var html = docTemplate(currentDocument);
            $viewer.html(html);
        }else{
            // if text is not yet loaded - load
            if( typeof currentDocument.AJAXText == 'undefined' || currentDocument.AJAXText === null ){
                // clean old stuff
                $viewer.html("Loading..");

                var url = currentDocument.uri;

                if(typeof url == 'undefined' || url === null ){
                    $viewer.html("This document has no body.");
                }else{
                    $.get(app.data.LogicServer + 'corsProxy?url=' +encodeURIComponent(url), function(data){
                        //var data = "<p>Extended answer info here</p><p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nulla quam velit, vulputate eu pharetra nec, mattis ac neque. Duis vulputate commodo lectus, ac blandit elit tincidunt id. Sed rhoncus, tortor sed eleifend tristique, tortor mauris molestie elit, et lacinia ipsum quam nec dui. Quisque nec mauris sit amet elit iaculis pretium sit amet quis magna. Aenean velit odio, elementum in tempus ut, vehicula eu diam. Pellentesque rhoncus aliquam mattis. Ut vulputate eros sed felis sodales nec vulputate justo hendrerit. Vivamus varius pretium ligula, a aliquam odio euismod sit amet. Quisque laoreet sem sit amet orci ullamcorper at ultricies metus viverra. Pellentesque arcu mauris, malesuada quis ornare accumsan, blandit sed diam.</p>"
                        if( data.length > 0 ){
                            currentDocument.AJAXText = data;
                            $viewer.html(data);
                        }else{
                            currentDocument.AJAXText = 0;
                            $viewer.html("This document has no body.");
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

                console.log(app.data);
            }, 1000);
        }
    });

    // starting annotation
    $startAnn.on("click", function(){
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

            console.log(answer.annotations);

            // render
            //answer.html = answer.html.replace(text, currentAnnotation.html);
            //updateQuestionText();

            // show buttons
            $startAnn.hide();
            $annCancel.show();
            $annDoc.show();
            $annTxt.show();
        }
    });

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
        $startAnn.show();
        $annCancel.hide();
        $annDoc.hide();
        $annTxt.hide();
    });

    $annTxt.on('click', function(){
        answer.text = $questionAnswer.val();
        var text = getSelectionHtml();

        if( text.length > 0 ){
            // update view
            //var oldHtml = currentAnnotation.html;
            // TODO: randomly generate color
            //currentAnnotation.html = currentAnnotation.html.replace("#fff000", "#ff0000");
            //answer.html = answer.html.replace(oldHtml, currentAnnotation.html);
            //updateQuestionText();

            // add doc data to annotation
            currentAnnotation["annotationDocument"] = currentDocument.uri;
            currentAnnotation["annotationText"] = text;
            currentAnnotation["annotationHTML"] = annTemplate({text: text, id: currentAnnotation.id});

            // render annotation in text
            if(currentDocument.domClass == 'documentResult'){
                for(var i = 0; i < currentDocument.sections.length; i++){
                    if(currentDocument.sections[i].indexOf(text) != -1 ){
                        currentDocument.sections[i] = currentDocument.sections[i].replace(
                            text,
                            currentAnnotation.annotationHTML
                        );
                        break;
                    }
                }
            }else{
                currentDocument.AJAXText = currentDocument.AJAXText.replace(
                    text,
                    currentAnnotation.annotationHTML
                );
            }

            // re-render
            renderCurrentDocument();

            // store current annotation
            app.data.question.answer = answer;
            app.save();

            // show buttons
            $startAnn.show();
            $annCancel.hide();
            $annDoc.hide();
            $annTxt.hide();
        }
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

        // set title
        $("#docTitle").text( $(this).text() );

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
        if(currentDocument.domClass == 'documentResult'){
            for(var j = 0; j < currentDocument.sections.length; j++){
                if(currentDocument.sections[j].indexOf(text) != -1 ){
                    currentDocument.sections[j] = currentDocument.sections[j].replace(
                        ann.annotationHTML,
                        text
                    );
                    break;
                }
            }
        }else{
            currentDocument.AJAXText = currentDocument.AJAXText.replace(
                ann.annotationHTML,
                text
            );
        }

        // remove from array
        answer.annotations.splice(i, 1);

        // re-render
        renderCurrentDocument();

        console.log(answer);
        console.log(app.data);
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
        i = 0;
    for(i = 0; i < selectedDocuments.length; i++){
        html += template(selectedDocuments[i]);
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
    }

    // append to dom
    $("#resultList").html(html);
});