// define config
requirejs.config({
    paths: {
        'libs': '../js-libs'
    },
    shim: {
        'bootstrap.min': ['jquery'],
        'jstorage.min': ['jquery', 'json2.min']
    }
});

// load common libraries
define(['jquery',
        'libs/json2.min',
        'libs/bootstrap.min',
        'libs/handlebars.min',
        'libs/jstorage.min'
    ],
    function($, Spinner){
    // define vars
    var logicServer = '/backend/';

    var App = function () {
        var that = this;

        this.data = {
            LogicServer: logicServer,
            user: '',
            username : '',
            questionID: ''
        };

        this.save = function () {
            $.jStorage.set('app.data', JSON.stringify(that.data));
        };

        this.load = function () {
            var data = $.jStorage.get('app.data', null);
            if (data !== null) {
                try {
                    that.data = JSON.parse(data);
                } catch (e) {
                    $.jStorage.flush();
                    window.location.href = window.location.href;
                }
            }
        };

        return this;
    };

    var currentApp = new App();
    currentApp.load();

    Handlebars.registerHelper('renderObject', function () {
        if (this.o.search(/^http:/) === 0) {
            return ('<' + this.o + '>');
        }

        return ('"' + this.o + '"');
    });

    return currentApp;
});
