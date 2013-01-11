///
/// for debugging, can be removed later
///
/*var selectedDocuments = [
    {
        "num": 1,
        "title": "Assessing Linked Data Mappings Using Network Measures",
        "web": "http://www.bibsonomy.org/bibtex/2e41de3cef8add9cb0d1da416ef894311/aksw",
        "pdf": "linked_mapping_qa.pdf"
    },
    {
        "num": 2,
        "title": "Hello world",
        "web": "http://www.bibsonomy.org/bibtex/2e41de3cef8add9cb0d1da416ef894311/aksw",
        "pdf": "helloworld.pdf"
    },
    {
        "num": 3,
        "title": "Test document number 3",
        "web": "http://www.bibsonomy.org/bibtex/2e41de3cef8add9cb0d1da416ef894311/aksw",
        "pdf": "linked_mapping_qa.pdf"
    },
    {
        "num": 4,
        "title": "Test document 4",
        "web": "http://www.bibsonomy.org/bibtex/2e41de3cef8add9cb0d1da416ef894311/aksw",
        "pdf": "linked_mapping_qa.pdf"
    }
];*/

require(["app"], function(app) {
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
        currentAnnotation = null,
        currentDocument = null;

    var selectedDocuments = app.data.entities;

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

    // event for freezing answer
    $("#freezeButton").on("click", function(){
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
    });

    // starting annotation
    $startAnn.on("click", function(){
        var text = getSelectionHtml();

        var begin = answer.text.indexOf(text);
        if( begin != -1 ){
            answer.annotations.push({
                "beginIndex": begin,
                "length": text.length,
                "text": text,
                "html": "<span style='background-color: #fff000;'>"+text+"</span>"
            });
            currentAnnotation = answer.annotations[answer.annotations.length-1];

            console.log(answer);
            console.log(currentAnnotation);

            // render
            answer.html = answer.html.replace(text, currentAnnotation.html);
            updateQuestionText();

            // show buttons
            $startAnn.hide();
            $annCancel.show();
            $annDoc.show();
            $annTxt.show();
        }
    });

    $annCancel.on('click', function(){
        // revert
        answer.html = answer.html.replace(currentAnnotation.html, currentAnnotation.text);
        updateQuestionText();

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
        var oldHtml = currentAnnotation.html;
        // TODO: randomly generate color
        currentAnnotation.html = currentAnnotation.html.replace("#fff000", "#ff0000");
        answer.html = answer.html.replace(oldHtml, currentAnnotation.html);
        updateQuestionText();

        // add doc data to annotation
        currentAnnotation["annotationDocument"] = currentDocument.uri;
        currentAnnotation["annotationText"] = null;

        console.log(answer);

        // show buttons
        $startAnn.show();
        $annCancel.hide();
        $annDoc.hide();
        $annTxt.hide();
    });

    $annTxt.on('click', function(){
        var text = getSelectionHtml();

        if( text.length > 0 ){
            // update view
            var oldHtml = currentAnnotation.html;
            // TODO: randomly generate color
            currentAnnotation.html = currentAnnotation.html.replace("#fff000", "#ff0000");
            answer.html = answer.html.replace(oldHtml, currentAnnotation.html);
            updateQuestionText();

            // add doc data to annotation
            currentAnnotation["annotationDocument"] = currentDocument.uri;
            currentAnnotation["annotationText"] = text;

            console.log(answer);

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
        $.post(app.data.LogicServer+"questions", question, function(){
            $("#saveSuccess").show();
        }).error(function(){
            $("#saveError").show();
        });
    });

    // on result docs click
    $("body").on("click", ".resultDocument", function(){
        // get pdf url
        var url = $(this).data('url');
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

        // prepare pdf viewer
        $viewer = $("#viewer");
        
        $viewer.html(
            "<p>Extended answer info here</p><p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nulla quam velit, vulputate eu pharetra nec, mattis ac neque. Duis vulputate commodo lectus, ac blandit elit tincidunt id. Sed rhoncus, tortor sed eleifend tristique, tortor mauris molestie elit, et lacinia ipsum quam nec dui. Quisque nec mauris sit amet elit iaculis pretium sit amet quis magna. Aenean velit odio, elementum in tempus ut, vehicula eu diam. Pellentesque rhoncus aliquam mattis. Ut vulputate eros sed felis sodales nec vulputate justo hendrerit. Vivamus varius pretium ligula, a aliquam odio euismod sit amet. Quisque laoreet sem sit amet orci ullamcorper at ultricies metus viverra. Pellentesque arcu mauris, malesuada quis ornare accumsan, blandit sed diam.</p>"
        );

        return false;
    });

    $("body").on("click", ".removeFromResults", function(){
        $(this).parent().parent().remove();
    });

    // render docs
    // compile template
    var source = $("#resultTemplate").html();
    var template = Handlebars.compile(source);
    // render to string
    var html = "",
        i = 0;
    for(i = 0; i < selectedDocuments.length; i++){
        html += template(selectedDocuments[i]);
    }

    // append to dom
    $("#resultList").html(html);
});