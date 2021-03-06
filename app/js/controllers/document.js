angular.module('bioasq-at.controllers.document', [])
.controller('DocumentCtrl', function ($scope, $sce, $window, Questions) {

    initAnnotationState();

    var annotateButton = angular.element($window.document.getElementById('annotate-button'));

    function injectSnippets(question, doc, sectionName) {
        return $sce.trustAsHtml(snippetDescription(question, doc, sectionName, false).text);
    }

    function snippetDescription(question, doc, sectionName, allowOverlap) {
        if (doc[sectionName]) {
            return highlightSnippetsInSection($scope,
                                            question,
                                            doc,
                                            doc[sectionName],
                                            sectionName,
                                            allowOverlap,
                                            $scope.mode === 'assessment');
        }
        return null;
    }

    function prepareScopeVars($scope, doc) {
        $scope.sectionConfig = {};
        var titleDescription = snippetDescription($scope.question, doc, 'title', false);
        if (titleDescription) {
            $scope.title = $sce.trustAsHtml(titleDescription.text);
            $scope.sectionConfig['title'] = { hasMultipleSnippets: titleDescription.hasMultipleSnippets };
        }

        var abstractDescription = snippetDescription($scope.question, doc, 'abstract', false);
        if (abstractDescription) {
            $scope.abstract = $sce.trustAsHtml(abstractDescription.text);
            $scope.sectionConfig['abstract'] = { hasMultipleSnippets: abstractDescription.hasMultipleSnippets };
        }

        $scope.sections = [];
        if (doc.sections) {
            doc.sections.forEach(function (s, i) {
                var sectionDescription = highlightSnippetsInSection($scope,
                                                                    $scope.question,
                                                                    doc,
                                                                    s,
                                                                    'sections.' + String(i),
                                                                    false,
                                                                    $scope.mode === 'assessment');
                $scope.sections[i] = $sce.trustAsHtml(sectionDescription.text);
                $scope.sectionConfig['sections.' + String(i)] =
                        { hasMultipleSnippets: sectionDescription.hasMultipleSnippets };
            });
        }
    }

    var findDocument = function (question, pubMedURI) {
        for (var i = 0; i < question.documents.length; i++) {
            if (question.documents[i].uri === pubMedURI) {
                return i;
            }
        }

        return -1;
    };

    $scope.$watch('selection.document', function (newValue, oldValue) {
        if (oldValue !== newValue) {
            $scope.question.answer = $scope.question.answer || {};
            $scope.question.snippets = $scope.question.snippets || [];
            delete $scope.title;
            delete $scope.abstract;
            delete $scope.sections;
            if (newValue) {
                if (newValue.abstract) {
                    prepareScopeVars($scope, newValue);
                } else {
                    Questions.loadDocument(newValue.uri)
                    .then(function (doc) {
                        var idx = findDocument($scope.question, newValue.uri);
                        if (idx > -1) {
                            if (doc['abstract']) { $scope.question.documents[idx]['abstract'] = doc['abstract']; }
                            if (doc['sections']) { $scope.question.documents[idx]['sections'] = doc['sections']; }
                            prepareScopeVars($scope, doc);
                        }
                    });
                }
            }
        }
    });

    $scope.startAnnotation = function () {
        viewerMouseDown(annotateButton);
    };

    $scope.endAnnotation = function () {
        viewerMouseUp(annotateButton);
    };

    $scope.nextSnippetInSection = function (sectionName) {
        nextSnippetInSection(sectionName);
        prepareScopeVars($scope, $scope.selection.document);
    };

    $scope.previousSnippetInSection = function (sectionName) {
        previousSnippetInSection(sectionName);
        prepareScopeVars($scope, $scope.selection.document);
    };

    $scope.createSnippet = function () {
        var snippet = snippetForSelection(annotateButton);

        if (!snippet) { return; }

        snippet.document = $scope.selection.document.uri;
        snippet._localID  = Questions.nextSnippetID();
        if ($scope.mode === 'assessment') {
            snippet.golden = true;
        }

        var documentSnippets = _.filter($scope.question.snippets, function (s) {
            return (s.document === snippet.document && 
                    s.beginSection === snippet.beginSection);
        });
        if (doesSnippetOverlapWithSnippets(snippet, documentSnippets)) {
            alert('Snippets must not overlap!');
            return;
        }

        Questions.addAnnotation(snippet);

        prepareScopeVars($scope, $scope.selection.document);
    };

    $scope.setKeepSelection = function (keep) {
        setKeepSelection(keep);
    };

    $scope.$on('delete-annotation', function (event, localID) {
        $scope.deleteSnippet(localID);
        prepareScopeVars($scope, $scope.selection.document);
        if (!$scope.$$phase) {
            $scope.$apply();
        }
    });
});
