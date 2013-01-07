// define config
requirejs.config({
    paths: {
        'libs': '../js-libs'
    },
    shim: {
        'bootstrap.min': {
            deps: ['jquery.min']
        }
    }
});

// load common libraries
define(["libs/jquery.min", "libs/bootstrap.min", "libs/handlebars.min"], function(){
    // define vars
    var logicServer = '/backend/';

    var App = function(){
        var that = this;

        this.data = {
            LogicServer: logicServer,
            user: "",
            question: {},
            entities: []
        };

        this.save = function(){
            var s = JSON.stringify(that.data);
            localStorage.setItem("app.data", s);
        };

        this.load = function(){
            var d = localStorage.getItem("app.data");
            if( typeof d != 'undefined' && d !== null )
                that.data = JSON.parse( d );
        };

        return this;
    };

    var currentApp = new App();
    currentApp.load();

    return currentApp;
});
