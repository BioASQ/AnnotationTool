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
    'libs/jstorage.min',
    'libs/lz-string-min'],
    function($, Spinner){
    // define vars
    var logicServer = '/backend/';

    var App = function () {
        var that = this;

        this.data = {
            LogicServer: logicServer,
            user: '',
            username : '',
            question: {}
        };

        this.save = function () {
            var s = LZString.compress(JSON.stringify(that.data));
            $.jStorage.set('app.data', s);
        };

        this.load = function () {
            var d = $.jStorage.get('app.data', null);
            if (d !== null) {
                that.data = JSON.parse(LZString.decompress(d));
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
