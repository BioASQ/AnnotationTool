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
        'libs/lz-string-min'
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
            question: {}
        };

        this.save = function () {
            var s = LZString.compress(JSON.stringify(that.data));
            $.jStorage.set('app.data', s);
            $.jStorage.set('app.compressed', 1);
        };

        this.load = function () {
            var data       = $.jStorage.get('app.data', null),
                compressed = parseInt($.jStorage.get('app.compressed', '0'), 10),
                cleared    = parseInt($.jStorage.get('app.cleared', '0'), 10);

            if (cleared === 1) {
                console.log('Local storage has been cleared.');
            }

            if (data !== null) {
                if (compressed === 1) {
                    data = LZString.decompress(data);
                }
                try {
                    that.data = JSON.parse(data);
                } catch (e) {
                    $.jStorage.flush();
                    $.jStorage.set('app.cleared', 1);
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
