angular.module('bioasq-at.controllers.document', [])
.controller('DocumentCtrl', function ($scope, $sce, $window) {

    initAnnotationState();

    var annotateButton = angular.element($window.document.getElementById('annotate-button'));

    function injectSnippets(answer, doc, sectionName) {
        return $sce.trustAsHtml(highlightSnippetsInSection($scope,
                                                           answer,
                                                           doc,
                                                           doc[sectionName],
                                                           sectionName,
                                                           false).text);
    }

    $scope.$watch('selection.document', function () {
        if ($scope.selection.document) {
            $scope.title    = injectSnippets($scope.question.answer, $scope.selection.document, 'title');
            $scope.abstract = injectSnippets($scope.question.answer, $scope.selection.document, 'abstract');
            $scope.sections = _.map($scope.selection.document.sections, function (s, i) {
                return $sce.trustAsHtml(highlightSnippetsInSection($scope,
                                                                   $scope.question.answer,
                                                                   $scope.selection.document,
                                                                   s,
                                                                   'sections.' + String(i)).text);
            });
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

        snippet.document = $scope.selection.document.uri;
        snippet.localID  = $scope.nextSnippetID++;

        var documentSnippets = _.filter($scope.question.answer.snippets, function (s) {
            return (s.document === snippet.document && 
                    s.beginSection === snippet.beginSection);
        });
        if (doesSnippetOverlapWithSnippets(snippet, documentSnippets)) {
            alert('Snippets must not overlap!');
            return;
        }

        $scope.question.answer.snippets.push(snippet);

        $scope.title    = injectSnippets($scope.question.answer, $scope.selection.document, 'title');
        $scope.abstract = injectSnippets($scope.question.answer, $scope.selection.document, 'abstract');
        $scope.sections = _.map($scope.selection.document.sections, function (s, i) {
            return $sce.trustAsHtml(highlightSnippetsInSection($scope,
                                                               $scope.question.answer,
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
        $scope.title    = injectSnippets($scope.question.answer, $scope.selection.document, 'title');
        $scope.abstract = injectSnippets($scope.question.answer, $scope.selection.document, 'abstract');
        $scope.sections = _.map($scope.selection.document.sections, function (s, i) {
            return $sce.trustAsHtml(highlightSnippetsInSection($scope,
                                                               $scope.question.answer,
                                                               $scope.selection.document,
                                                               s,
                                                               'sections.' + String(i)).text);
        });
        if (!$scope.$$phase) {
            $scope.$apply();
        }
    });
});
