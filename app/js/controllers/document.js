angular.module('bioasq-at.controllers.document', [])
.controller('DocumentCtrl', function ($scope, $sce, $window, Questions) {

    initAnnotationState();

    var annotateButton = angular.element($window.document.getElementById('annotate-button'));

    function injectSnippets(question, doc, sectionName) {
        return $sce.trustAsHtml(highlightSnippetsInSection($scope,
                                                           question,
                                                           doc,
                                                           doc[sectionName],
                                                           sectionName,
                                                           false).text);
    }

    $scope.$watch('selection.document', function (newValue, oldValue) {
        if (oldValue !== newValue) {
            $scope.question.answer = $scope.question.answer || {};
            $scope.question.snippets = $scope.question.snippets || [];
            if (newValue) {
                $scope.title    = injectSnippets($scope.question, newValue, 'title');
                $scope.abstract = injectSnippets($scope.question, newValue, 'abstract');
                $scope.sections = _.map(newValue.sections, function (s, i) {
                    return $sce.trustAsHtml(highlightSnippetsInSection($scope,
                                                                    $scope.question,
                                                                    newValue,
                                                                    s,
                                                                    'sections.' + String(i)).text);
                });
            } else {
                delete $scope.title;
                delete $scope.abstract;
                delete $scope.sections;
            }
        }
    });

    $scope.startAnnotation = function () {
        if (!$scope.question.finalized) {
            viewerMouseDown(annotateButton);
        }
    };

    $scope.endAnnotation = function () {
        if (!$scope.question.finalized) {
            viewerMouseUp(annotateButton);
        }
    };

    $scope.createSnippet = function () {
        var snippet = snippetForSelection(annotateButton);

        if (!snippet) { return; }

        snippet.document = $scope.selection.document.uri;
        snippet._localID  = Questions.nextSnippetID();

        var documentSnippets = _.filter($scope.question.snippets, function (s) {
            return (s.document === snippet.document && 
                    s.beginSection === snippet.beginSection);
        });
        if (doesSnippetOverlapWithSnippets(snippet, documentSnippets)) {
            alert('Snippets must not overlap!');
            return;
        }

        Questions.addAnnotation(snippet);

        $scope.title    = injectSnippets($scope.question, $scope.selection.document, 'title');
        $scope.abstract = injectSnippets($scope.question, $scope.selection.document, 'abstract');
        $scope.sections = _.map($scope.selection.document.sections, function (s, i) {
            return $sce.trustAsHtml(highlightSnippetsInSection($scope,
                                                               $scope.question,
                                                               $scope.selection.document,
                                                               s,
                                                               'sections.' + String(i)).text);
        });
    };

    $scope.setKeepSelection = function (keep) {
        setKeepSelection(keep);
    };

    $scope.$on('delete-annotation', function (event, localID) {
        if ($scope.question.finalized) {
            return;
        }
        $scope.deleteSnippet(localID);
        $scope.title    = injectSnippets($scope.question, $scope.selection.document, 'title');
        $scope.abstract = injectSnippets($scope.question, $scope.selection.document, 'abstract');
        $scope.sections = _.map($scope.selection.document.sections, function (s, i) {
            return $sce.trustAsHtml(highlightSnippetsInSection($scope,
                                                               $scope.question,
                                                               $scope.selection.document,
                                                               s,
                                                               'sections.' + String(i)).text);
        });
        if (!$scope.$$phase) {
            $scope.$apply();
        }
    });
});
